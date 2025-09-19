import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Company from '@/models/Company';
import WABA from '@/models/WABA';
import { createWhatsAppAPI } from '@/lib/whatsapp';
import { getAuthContext, hasPermission } from '@/lib/auth-context';

// GET /api/companies/[companyId]/wabas - Get all WABAs for a company
export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { user } = await getAuthContext(request);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const companyId = params.companyId;
    
    // Check if user has access to this company
    if (!user.hasCompanyAccess(companyId)) {
      return NextResponse.json({ error: 'No access to this company' }, { status: 403 });
    }

    // Find all WABAs for this company
    const wabas = await WABA.findByCompany(companyId);
    
    return NextResponse.json({ 
      wabas,
      currentWABAId: user.preferences.currentWABAId 
    });
  } catch (error) {
    console.error('Error fetching WABAs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/companies/[companyId]/wabas - Create a new WABA for company
export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const { user } = await getAuthContext(request);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const companyId = params.companyId;
    
    // Check if user has permission to manage WABA
    const userRole = user.getCompanyRole(companyId);
    const userPermissions = user.companies.find(c => 
      c.companyId.toString() === companyId.toString()
    )?.permissions || [];
    
    if (!hasPermission(userRole, userPermissions, 'manage_waba')) {
      return NextResponse.json({ error: 'No permission to manage WABAs' }, { status: 403 });
    }

    // Find the company
    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const wabaData = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'accessToken', 'businessAccountId', 'phoneNumberId', 'phoneNumber', 'displayPhoneNumber'];
    for (const field of requiredFields) {
      if (!wabaData[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    // Test WhatsApp API connection
    try {
      const testConfig = {
        accessToken: wabaData.accessToken,
        businessAccountId: wabaData.businessAccountId,
        phoneNumberId: wabaData.phoneNumberId,
      };
      
      const whatsappAPI = createWhatsAppAPI(testConfig);
      await whatsappAPI.fetchAllTemplates(); // Test connection
    } catch (connectionError) {
      return NextResponse.json({ 
        error: 'Failed to connect to WhatsApp API. Please check your credentials.',
        details: connectionError.message 
      }, { status: 400 });
    }

    // Check subscription limits
    const currentWABACount = await WABA.countDocuments({ companyId, status: 'active' });
    if (currentWABACount >= company.subscription.features.maxWABA) {
      return NextResponse.json({ 
        error: `Maximum WABA limit reached (${company.subscription.features.maxWABA}). Upgrade your plan to add more.` 
      }, { status: 400 });
    }

    // Check if this is the first WABA for the company
    const isFirstWABA = currentWABACount === 0;

    // Create WABA
    const waba = new WABA({
      name: wabaData.name,
      description: wabaData.description,
      companyId,
      whatsappConfig: {
        accessToken: wabaData.accessToken,
        businessAccountId: wabaData.businessAccountId,
        phoneNumberId: wabaData.phoneNumberId,
        phoneNumber: wabaData.phoneNumber,
        displayPhoneNumber: wabaData.displayPhoneNumber,
        webhookVerifyToken: wabaData.webhookVerifyToken,
        apiVersion: wabaData.apiVersion || 'v19.0',
      },
      businessProfile: wabaData.businessProfile || {},
      defaultSettings: wabaData.defaultSettings || {},
      isDefault: isFirstWABA || wabaData.isDefault, // First WABA becomes default
      status: 'active',
      createdBy: user._id,
    });

    await waba.save();

    // Test connection and update health status
    await waba.testConnection();

    // Update company usage
    await company.updateUsage({ currentWABA: currentWABACount + 1 });

    // If this is the first WABA, set it as user's current WABA
    if (isFirstWABA && !user.preferences.currentWABAId) {
      user.preferences.currentWABAId = waba._id;
      await user.save();
    }

    return NextResponse.json({ 
      waba: waba.toJSON(),
      message: 'WABA created successfully' 
    });
  } catch (error) {
    console.error('Error creating WABA:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
