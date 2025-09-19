import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import WABA from '@/models/WABA';
import { getAuthContext } from '@/lib/auth-context';

// POST /api/user/switch-waba - Switch user's current WABA
export async function POST(request) {
  try {
    await dbConnect();
    
    const { user } = await getAuthContext(request);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { wabaId } = await request.json();
    
    if (!wabaId) {
      return NextResponse.json({ error: 'WABA ID is required' }, { status: 400 });
    }

    // Find the WABA and verify user has access
    const waba = await WABA.findById(wabaId);
    if (!waba) {
      return NextResponse.json({ error: 'WABA not found' }, { status: 404 });
    }

    // Check if user has access to the company that owns this WABA
    if (!user.hasCompanyAccess(waba.companyId)) {
      return NextResponse.json({ error: 'No access to this WABA' }, { status: 403 });
    }

    // Update user's current WABA
    user.preferences.currentWABAId = wabaId;
    await user.save();

    return NextResponse.json({ 
      message: 'WABA switched successfully',
      currentWABAId: wabaId,
    });
  } catch (error) {
    console.error('Error switching WABA:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
