import { NextResponse } from 'next/server';
import { migrateToMultiTenant, checkMigrationStatus } from '@/lib/migrate-to-multi-tenant';
import { getAuthContext } from '@/lib/auth-context';

// GET /api/admin/migrate - Check migration status
export async function GET(request) {
  try {
    const { user } = await getAuthContext(request);
    
    // Only allow admins to check migration status
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const status = await checkMigrationStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/migrate - Run migration
export async function POST(request) {
  try {
    const { user } = await getAuthContext(request);
    
    // Only allow admins to run migration
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const result = await migrateToMultiTenant();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Migration completed successfully',
        ...result
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error running migration:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
