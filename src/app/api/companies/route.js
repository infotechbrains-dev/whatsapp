import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Company from '@/models/Company';
import { getAuthContext } from '@/lib/auth-context';

// GET /api/companies - Get all companies user has access to
export async function GET(request) {
  try {
    await dbConnect();
    
    const { user } = await getAuthContext(request);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find all companies user has access to
    const companyIds = user.companies
      .filter(company => company.status === 'active')
      .map(company => company.companyId);
    
    const companies = await Company.find({
      _id: { $in: companyIds },
      status: 'active'
    }).populate('createdBy', 'firstName lastName email');

    // Add user's role and permissions for each company
    const companiesWithUserInfo = companies.map(company => {
      const userCompany = user.companies.find(uc => 
        uc.companyId.toString() === company._id.toString()
      );
      
      return {
        ...company.toJSON(),
        userRole: userCompany?.role,
        userPermissions: userCompany?.permissions,
        joinedAt: userCompany?.joinedAt,
      };
    });
    
    return NextResponse.json({ 
      companies: companiesWithUserInfo,
      currentCompanyId: user.preferences.currentCompanyId 
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/companies - Create a new company
export async function POST(request) {
  try {
    await dbConnect();
    
    const { user } = await getAuthContext(request);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const companyData = await request.json();
    
    // Validate required fields
    if (!companyData.name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    // Create company
    const company = new Company({
      name: companyData.name,
      description: companyData.description,
      industry: companyData.industry,
      website: companyData.website,
      phone: companyData.phone,
      email: companyData.email,
      address: companyData.address,
      timezone: companyData.timezone || 'UTC',
      currency: companyData.currency || 'USD',
      settings: companyData.settings || {},
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
    });
    
    await company.save();

    // Add company to user's companies list
    await user.addToCompany(company._id, 'owner', company.owners[0].permissions);

    return NextResponse.json({ 
      company: company.toJSON(),
      message: 'Company created successfully' 
    });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
