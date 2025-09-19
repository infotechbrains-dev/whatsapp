import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Template from '@/models/Template';
import User from '@/models/User';
import { createWhatsAppAPI } from '@/lib/whatsapp';
import jwt from 'jsonwebtoken';

// Helper function to verify JWT token
async function verifyToken(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      throw new Error('No token provided');
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// GET /api/templates/[name] - Get specific template
export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const decoded = await verifyToken(request);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.whatsappConfig) {
      return NextResponse.json({ error: 'WhatsApp configuration not found' }, { status: 400 });
    }

    const templateName = decodeURIComponent(params.name);
    
    // Find template in database
    const template = await Template.findOne({ 
      userId: user._id, 
      name: templateName 
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/templates/[name] - Delete template
export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    
    const decoded = await verifyToken(request);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.whatsappConfig) {
      return NextResponse.json({ error: 'WhatsApp configuration not found' }, { status: 400 });
    }

    const templateName = decodeURIComponent(params.name);
    
    // Create WhatsApp API instance
    const whatsappAPI = createWhatsAppAPI(user.whatsappConfig);
    
    try {
      // Delete template from WhatsApp API
      await whatsappAPI.deleteTemplate(templateName);
    } catch (whatsappError) {
      console.log('WhatsApp API delete error (template may not exist on WhatsApp):', whatsappError.message);
      // Continue with database deletion even if WhatsApp deletion fails
    }
    
    // Delete template from database
    const deletedTemplate = await Template.findOneAndDelete({ 
      userId: user._id, 
      name: templateName 
    });

    if (!deletedTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
