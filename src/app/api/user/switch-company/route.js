import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getAuthContext } from '@/lib/auth-context';

// POST /api/user/switch-company - Switch user's current company
export async function POST(request) {
  try {
    await dbConnect();
    
    const { user } = await getAuthContext(request);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { companyId, wabaId } = await request.json();
    
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Check if user has access to this company
    if (!user.hasCompanyAccess(companyId)) {
      return NextResponse.json({ error: 'No access to this company' }, { status: 403 });
    }

    // Switch company (and optionally WABA)
    await user.switchCompany(companyId, wabaId);

    return NextResponse.json({ 
      message: 'Company switched successfully',
      currentCompanyId: companyId,
      currentWABAId: wabaId,
    });
  } catch (error) {
    console.error('Error switching company:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
