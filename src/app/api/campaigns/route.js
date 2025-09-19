import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Campaign from '@/models/Campaign';
import Contact from '@/models/Contact';
import Template from '@/models/Template';
import Message from '@/models/Message';
import User from '@/models/User';
import { createWhatsAppAPI } from '@/lib/whatsapp';
import jwt from 'jsonwebtoken';

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

// GET /api/campaigns - List campaigns for user
export async function GET(request) {
  try {
    await dbConnect();
    
    const decoded = await verifyToken(request);
    const campaigns = await Campaign.find({ userId: decoded.userId })
      .populate('templateId', 'name status description')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/campaigns - Create a new campaign
export async function POST(request) {
  try {
    await dbConnect();
    
    const decoded = await verifyToken(request);
    const campaignData = await request.json();
    
    // Validate required fields based on message type
    if (!campaignData.name || !campaignData.messageType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Additional validation based on message type
    if (campaignData.messageType === 'template' && !campaignData.templateId) {
      return NextResponse.json({ error: 'Template ID required for template messages' }, { status: 400 });
    }
    
    if (campaignData.messageType === 'text' && !campaignData.textMessage) {
      return NextResponse.json({ error: 'Text message required for text messages' }, { status: 400 });
    }
    
    if (['image', 'video', 'document'].includes(campaignData.messageType) && !campaignData.messageMediaId) {
      return NextResponse.json({ error: `Media file required for ${campaignData.messageType} messages` }, { status: 400 });
    }

    // Verify template exists and belongs to user (only for template messages)
    let template = null;
    if (campaignData.messageType === 'template') {
      template = await Template.findOne({ 
        _id: campaignData.templateId, 
        userId: decoded.userId 
      });
      
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
    }

    // Get contacts based on filters
    let contacts = [];
    if (campaignData.contactIds && campaignData.contactIds.length > 0) {
      // Use specific contact IDs
      contacts = await Contact.find({ 
        _id: { $in: campaignData.contactIds },
        userId: decoded.userId,
        status: 'active'
      });
    } else if (campaignData.contactFilters) {
      // Use filters to find contacts
      const query = { userId: decoded.userId, status: 'active' };
      
      if (campaignData.contactFilters.excludeUnsubscribed) {
        query.isUnsubscribed = false;
      }
      
      if (campaignData.contactFilters.tags && campaignData.contactFilters.tags.length > 0) {
        query.tags = { $in: campaignData.contactFilters.tags };
      }
      
      contacts = await Contact.find(query);
    }

    // Create campaign
    const campaign = new Campaign({
      userId: decoded.userId,
      name: campaignData.name,
      description: campaignData.description,
      messageType: campaignData.messageType,
      templateId: template?._id,
      status: 'draft',
      scheduledDate: campaignData.scheduledDate,
      contactIds: contacts.map(c => c._id),
      contactFilters: campaignData.contactFilters || {},
      headerValue: campaignData.headerValue,
      headerMediaId: campaignData.headerMediaId,
      bodyParameters: campaignData.bodyParameters || [],
      textMessage: campaignData.textMessage,
      messageMediaId: campaignData.messageMediaId,
      stats: {
        totalContacts: contacts.length,
      },
      settings: {
        batchSize: campaignData.settings?.batchSize || 50,
        delayBetweenMessages: campaignData.settings?.delayBetweenMessages || 500,
        retryFailedMessages: campaignData.settings?.retryFailedMessages || false,
        maxRetries: campaignData.settings?.maxRetries || 3,
      },
    });

    await campaign.save();
    await campaign.populate('templateId', 'name status description');
    
    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
