import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
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

// POST /api/debug/template-creation - Test template creation with minimal data
export async function POST(request) {
  try {
    await dbConnect();
    
    const decoded = await verifyToken(request);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.whatsappConfig) {
      return NextResponse.json({ error: 'WhatsApp configuration not found' }, { status: 400 });
    }

    // Create WhatsApp API instance
    const whatsappAPI = createWhatsAppAPI(user.whatsappConfig);
    
    console.log('Testing WhatsApp API connection...');
    console.log('Business Account ID:', user.whatsappConfig.businessAccountId);
    console.log('Phone Number ID:', user.whatsappConfig.phoneNumberId);
    
    // Test 1: Simple text-only template
    const simpleTemplate = {
      name: 'test_template_' + Date.now(),
      category: 'UTILITY',
      language: 'en_US',
      components: [
        {
          type: 'BODY',
          text: 'This is a test template.'
        }
      ]
    };

    console.log('Creating simple template:', simpleTemplate);

    try {
      const response = await whatsappAPI.createTemplate(simpleTemplate);
      console.log('Simple template creation successful:', response);
      
      return NextResponse.json({
        success: true,
        message: 'Simple template created successfully',
        templateName: simpleTemplate.name,
        response: response
      });
    } catch (error) {
      console.error('Simple template creation failed:', error.response?.data || error.message);
      
      return NextResponse.json({
        success: false,
        error: 'Template creation failed',
        details: error.response?.data || error.message,
        templateName: simpleTemplate.name
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/debug/template-creation - Get WhatsApp configuration info
export async function GET(request) {
  try {
    await dbConnect();
    
    const decoded = await verifyToken(request);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.whatsappConfig) {
      return NextResponse.json({ error: 'WhatsApp configuration not found' }, { status: 400 });
    }

    return NextResponse.json({
      hasConfig: true,
      businessAccountId: user.whatsappConfig.businessAccountId,
      phoneNumberId: user.whatsappConfig.phoneNumberId,
      hasAccessToken: !!user.whatsappConfig.accessToken,
      apiVersion: user.whatsappConfig.apiVersion || 'v19.0'
    });
    
  } catch (error) {
    console.error('Debug GET endpoint error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
