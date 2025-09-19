import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Company from '@/models/Company';
import WABA from '@/models/WABA';
import jwt from 'jsonwebtoken';
import { createWhatsAppAPI } from './whatsapp';

// Helper function to verify JWT token and get user context
export async function getAuthContext(request) {
  try {
    await dbConnect();
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      throw new Error('No token provided');
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError.message);
      throw new Error('Invalid or expired token');
    }
    
    if (!decoded.userId) {
      throw new Error('Invalid token payload');
    }
    
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive || user.deletedAt) {
      throw new Error('User not found or inactive');
    }

    return { user };
  } catch (error) {
    console.error('Auth context error:', error.message);
    if (error.message.includes('token') || error.message.includes('User not found')) {
      throw error;
    }
    throw new Error('Authentication failed');
  }
}

// Helper function to get current company and WABA context
export async function getMultiTenantContext(request) {
  try {
    const { user } = await getAuthContext(request);
    
    // Get current company
    let currentCompanyId = user.preferences.currentCompanyId;
    if (!currentCompanyId && user.companies.length > 0) {
      // If no current company set, use the first active company
      const activeCompany = user.companies.find(c => c.status === 'active');
      currentCompanyId = activeCompany?.companyId;
      
      // Update user preferences
      if (currentCompanyId) {
        user.preferences.currentCompanyId = currentCompanyId;
        await user.save();
      }
    }
    
    // Auto-create default company for users without companies (backward compatibility)
    if (!currentCompanyId) {
      console.log(`Auto-creating default company for user: ${user.email}`);
      
      // Create default company
      const company = new Company({
        name: `${user.fullName || user.firstName + ' ' + user.lastName || user.email}'s Business`,
        description: 'Auto-created default company',
        createdBy: user._id,
        owners: [{
          userId: user._id,
          role: 'owner',
          permissions: [
            'manage_waba',
            'manage_templates',
            'manage_campaigns', 
            'manage_contacts',
            'view_analytics',
            'manage_users',
            'manage_settings',
            'manage_billing',
            'export_data'
          ],
          status: 'active',
        }],
        status: 'active',
      });
      
      await company.save();
      
      // Add company to user
      await user.addToCompany(company._id, 'owner', company.owners[0].permissions);
      currentCompanyId = company._id;
      
      // Auto-create WABA if user has legacy WhatsApp config
      if (user.whatsappConfig && user.whatsappConfig.businessAccountId && !user.whatsappConfig.migrated) {
        const waba = new WABA({
          name: 'Main WhatsApp Number',
          description: 'Auto-migrated from legacy setup',
          companyId: company._id,
          whatsappConfig: {
            accessToken: user.whatsappConfig.accessToken,
            businessAccountId: user.whatsappConfig.businessAccountId,
            phoneNumberId: user.whatsappConfig.phoneNumberId,
            phoneNumber: user.whatsappConfig.phoneNumberId || 'Unknown',
            displayPhoneNumber: user.whatsappConfig.phoneNumberId || 'Unknown',
            webhookVerifyToken: user.whatsappConfig.webhookVerifyToken,
            apiVersion: 'v19.0',
          },
          isDefault: true,
          status: 'active',
          createdBy: user._id,
        });
        
        await waba.save();
        
        // Set as current WABA
        user.preferences.currentWABAId = waba._id;
        user.whatsappConfig.migrated = true;
        await user.save();
        
        console.log(`Auto-created WABA for user: ${user.email}`);
      }
    }
    
    // Verify user has access to this company
    if (!user.hasCompanyAccess(currentCompanyId)) {
      throw new Error('No access to selected company');
    }
    
    // Get company details
    const company = await Company.findById(currentCompanyId);
    if (!company || company.status !== 'active') {
      throw new Error('Company not found or inactive');
    }
    
    // Get user role and permissions
    const userRole = user.getCompanyRole(currentCompanyId);
    const userPermissions = user.companies.find(c => 
      c.companyId.toString() === currentCompanyId.toString()
    )?.permissions || [];
    
    // Get current WABA
    let currentWABA = null;
    let currentWABAId = user.preferences.currentWABAId;
    
    if (currentWABAId) {
      currentWABA = await WABA.findOne({ 
        _id: currentWABAId, 
        companyId: currentCompanyId,
        status: 'active' 
      });
    }
    
    // If no current WABA or invalid WABA, get default WABA for company
    if (!currentWABA) {
      currentWABA = await WABA.findDefaultByCompany(currentCompanyId);
      
      // If found, update user preferences
      if (currentWABA) {
        user.preferences.currentWABAId = currentWABA._id;
        await user.save();
      }
    }
    
    return {
      user,
      company,
      currentWABA,
      userRole,
      userPermissions,
      companyId: currentCompanyId,
      wabaId: currentWABA?._id,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

// Helper function to check permissions
export function hasPermission(userRole, userPermissions, requiredPermission) {
  // Owners and admins have all permissions
  if (['owner', 'admin'].includes(userRole)) {
    return true;
  }
  
  return userPermissions.includes(requiredPermission);
}

// Helper function to get WhatsApp API instance for current WABA
export function getWhatsAppAPI(currentWABA) {
  if (!currentWABA) {
    throw new Error('No WhatsApp Business Account selected');
  }
  
  if (currentWABA.status !== 'active') {
    throw new Error('WhatsApp Business Account is not active');
  }
  
  return createWhatsAppAPI(currentWABA.whatsappConfig);
}

// Middleware to check specific permissions
export function requirePermission(permission) {
  return async function checkPermission(context) {
    const { userRole, userPermissions } = context;
    
    if (!hasPermission(userRole, userPermissions, permission)) {
      throw new Error(`Missing required permission: ${permission}`);
    }
    
    return true;
  };
}

// Helper for API routes that need multi-tenant context
export async function withMultiTenantContext(request, handler) {
  try {
    const context = await getMultiTenantContext(request);
    return await handler(context);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 401 });
  }
}
