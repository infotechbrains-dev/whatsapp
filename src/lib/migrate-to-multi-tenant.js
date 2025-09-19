import dbConnect from './mongodb';
import User from '../models/User';
import Company from '../models/Company';
import WABA from '../models/WABA';
import Template from '../models/Template';
import Campaign from '../models/Campaign';
import Contact from '../models/Contact';
import Message from '../models/Message';

/**
 * Migration script to convert existing single-tenant data to multi-tenant
 * This should be run once when upgrading to the multi-tenant version
 */
export async function migrateToMultiTenant() {
  try {
    await dbConnect();
    
    console.log('Starting multi-tenant migration...');
    
    // Find all users who haven't been migrated yet
    const users = await User.find({ 
      'whatsappConfig.migrated': { $ne: true },
      whatsappConfig: { $exists: true },
      'whatsappConfig.businessAccountId': { $exists: true }
    });
    
    console.log(`Found ${users.length} users to migrate`);
    
    for (const user of users) {
      console.log(`Migrating user: ${user.email}`);
      
      try {
        // Create a default company for this user
        const company = new Company({
          name: `${user.fullName || user.email}'s Business`,
          description: 'Auto-created during migration',
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
        console.log(`  ✓ Created company: ${company.name}`);
        
        // Create WABA from user's WhatsApp config
        const waba = new WABA({
          name: 'Main WhatsApp Number',
          description: 'Migrated from single-tenant setup',
          companyId: company._id,
          whatsappConfig: {
            accessToken: user.whatsappConfig.accessToken,
            businessAccountId: user.whatsappConfig.businessAccountId,
            phoneNumberId: user.whatsappConfig.phoneNumberId,
            phoneNumber: user.whatsappConfig.phoneNumberId, // Use as placeholder
            displayPhoneNumber: user.whatsappConfig.phoneNumberId, // Use as placeholder
            webhookVerifyToken: user.whatsappConfig.webhookVerifyToken,
            apiVersion: 'v19.0',
          },
          isDefault: true,
          status: 'active',
          createdBy: user._id,
        });
        
        await waba.save();
        console.log(`  ✓ Created WABA: ${waba.name}`);
        
        // Update user to add company relationship and set current context
        await user.addToCompany(company._id, 'owner', company.owners[0].permissions);
        user.preferences = user.preferences || {};
        user.preferences.currentCompanyId = company._id;
        user.preferences.currentWABAId = waba._id;
        user.whatsappConfig.migrated = true;
        await user.save();
        console.log(`  ✓ Updated user company relationships`);
        
        // Migrate templates
        const templates = await Template.find({ userId: user._id, companyId: { $exists: false } });
        if (templates.length > 0) {
          await Template.updateMany(
            { userId: user._id, companyId: { $exists: false } },
            { 
              $set: { 
                companyId: company._id,
                wabaId: waba._id 
              } 
            }
          );
          console.log(`  ✓ Migrated ${templates.length} templates`);
        }
        
        // Migrate campaigns
        const campaigns = await Campaign.find({ userId: user._id, companyId: { $exists: false } });
        if (campaigns.length > 0) {
          await Campaign.updateMany(
            { userId: user._id, companyId: { $exists: false } },
            { 
              $set: { 
                companyId: company._id,
                wabaId: waba._id 
              } 
            }
          );
          console.log(`  ✓ Migrated ${campaigns.length} campaigns`);
        }
        
        // Migrate contacts
        const contacts = await Contact.find({ userId: user._id, companyId: { $exists: false } });
        if (contacts.length > 0) {
          await Contact.updateMany(
            { userId: user._id, companyId: { $exists: false } },
            { 
              $set: { 
                companyId: company._id 
              } 
            }
          );
          console.log(`  ✓ Migrated ${contacts.length} contacts`);
        }
        
        // Migrate messages
        const messages = await Message.find({ userId: user._id, companyId: { $exists: false } });
        if (messages.length > 0) {
          await Message.updateMany(
            { userId: user._id, companyId: { $exists: false } },
            { 
              $set: { 
                companyId: company._id,
                wabaId: waba._id 
              } 
            }
          );
          console.log(`  ✓ Migrated ${messages.length} messages`);
        }
        
        console.log(`  ✅ Successfully migrated user: ${user.email}`);
        
      } catch (userError) {
        console.error(`  ❌ Error migrating user ${user.email}:`, userError);
      }
    }
    
    console.log('Migration completed!');
    
    // Return summary
    const totalCompanies = await Company.countDocuments();
    const totalWABAs = await WABA.countDocuments();
    
    return {
      success: true,
      usersMigrated: users.length,
      companiesCreated: totalCompanies,
      wabasCreated: totalWABAs,
    };
    
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check if migration is needed
 */
export async function checkMigrationStatus() {
  try {
    await dbConnect();
    
    const unmigrated = await User.countDocuments({ 
      'whatsappConfig.migrated': { $ne: true },
      whatsappConfig: { $exists: true },
      'whatsappConfig.businessAccountId': { $exists: true }
    });
    
    const companies = await Company.countDocuments();
    const wabas = await WABA.countDocuments();
    
    return {
      needsMigration: unmigrated > 0,
      unmigratedUsers: unmigrated,
      existingCompanies: companies,
      existingWABAs: wabas,
    };
  } catch (error) {
    return {
      needsMigration: false,
      error: error.message,
    };
  }
}
