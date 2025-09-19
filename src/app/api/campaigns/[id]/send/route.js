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

// POST /api/campaigns/[id]/send - Send campaign messages
export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const decoded = await verifyToken(request);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.whatsappConfig) {
      return NextResponse.json({ error: 'WhatsApp configuration not found' }, { status: 400 });
    }

    // Check user's message limit
    if (user.subscription.messagesUsed >= user.subscription.messageLimit) {
      return NextResponse.json({ error: 'Message limit exceeded' }, { status: 403 });
    }

    const resolvedParams = await params;
    const campaign = await Campaign.findOne({ 
      _id: resolvedParams.id, 
      userId: decoded.userId 
    }).populate('templateId').populate('headerMediaId').populate('messageMediaId');
    
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status !== 'draft' && campaign.status !== 'paused') {
      return NextResponse.json({ error: 'Campaign cannot be sent in current status' }, { status: 400 });
    }

    // Update campaign status
    campaign.status = 'running';
    campaign.startDate = new Date();
    await campaign.save();

    // Get contacts for the campaign
    const contacts = await Contact.find({ 
      _id: { $in: campaign.contactIds },
      userId: decoded.userId,
      isUnsubscribed: false,
      status: 'active'
    });

    // Get template analysis
    const whatsappAPI = createWhatsAppAPI(user.whatsappConfig);
    const templateAnalysis = whatsappAPI.analyzeTemplateParameters(campaign.templateId);

    // Start sending messages (this will run in background)
    processCampaignMessages(campaign, contacts, templateAnalysis, user, whatsappAPI);

    return NextResponse.json({ 
      message: 'Campaign sending started', 
      campaignId: campaign._id,
      totalContacts: contacts.length 
    });

  } catch (error) {
    console.error('Error sending campaign:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function processCampaignMessages(campaign, contacts, templateAnalysis, user, whatsappAPI) {
  let messagesSent = 0;
  let messagesDelivered = 0;
  let messagesFailed = 0;
  let messagesSkipped = 0;

  const batchSize = campaign.settings.batchSize || 50;
  const delayBetweenMessages = campaign.settings.delayBetweenMessages || 500;

  console.log(`Starting campaign ${campaign._id} - Processing ${contacts.length} contacts`);

  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);
    
    for (const contact of batch) {
      try {
        // Check if user still has message quota
        const updatedUser = await User.findById(user._id);
        if (updatedUser.subscription.messagesUsed >= updatedUser.subscription.messageLimit) {
          console.log(`Message limit reached for user ${user._id}, stopping campaign`);
          await Campaign.findByIdAndUpdate(campaign._id, { 
            status: 'paused',
            'stats.messagesSent': messagesSent,
            'stats.messagesFailed': messagesFailed,
            'stats.messagesSkipped': messagesSkipped + (contacts.length - i - batch.indexOf(contact))
          });
          return;
        }

        // Check if contact is still valid
        if (contact.isUnsubscribed) {
          messagesSkipped++;
          continue;
        }

        // Create message record
        const message = new Message({
          userId: user._id,
          contactId: contact._id,
          templateId: campaign.templateId._id,
          campaignId: campaign._id,
          phoneNumber: contact.phoneNumber,
          normalizedPhoneNumber: contact.normalizedPhoneNumber,
          direction: 'outbound',
          type: campaign.messageType,
          status: 'SENDING',
          content: campaign.messageType === 'template' ? {
            templateName: campaign.templateId.name,
            templateLanguage: campaign.templateId.language,
            headerValue: campaign.headerValue,
            headerMediaUrl: campaign.headerMediaId?.s3Url || null,
            bodyParameters: campaign.bodyParameters,
          } : {
            text: campaign.textMessage,
            mediaUrl: campaign.messageMediaId?.s3Url || null,
            mediaType: campaign.messageType,
          },
          scheduledDate: campaign.scheduledDate,
        });

        await message.save();

        try {
          let response;
          
          // Send message via WhatsApp API based on message type
          if (campaign.messageType === 'template') {
            response = await whatsappAPI.sendTemplateMessage({
              phoneNumber: contact.normalizedPhoneNumber,
              templateName: campaign.templateId.name,
              languageCode: campaign.templateId.language,
              headerValue: campaign.headerValue,
              headerMediaUrl: campaign.headerMediaId?.s3Url || null,
              bodyParameters: campaign.bodyParameters,
              templateAnalysis: templateAnalysis
            });
          } else if (campaign.messageType === 'text') {
            response = await whatsappAPI.sendTextMessage(
              contact.normalizedPhoneNumber,
              campaign.textMessage
            );
          } else if (['image', 'video', 'document'].includes(campaign.messageType)) {
            response = await whatsappAPI.sendMediaMessage(
              contact.normalizedPhoneNumber,
              campaign.messageMediaId.s3Url,
              campaign.messageType,
              campaign.textMessage || null
            );
          }

          // Update message with WhatsApp message ID
          if (response.messages && response.messages[0] && response.messages[0].id) {
            message.whatsappMessageId = response.messages[0].id;
            message.status = 'SENT';
            message.sentDate = new Date();
            messagesSent++;
            
            // Update user's message usage
            user.subscription.messagesUsed += 1;
            await user.save();
            
          } else {
            message.status = 'FAILED';
            message.errorMessage = 'No message ID received from WhatsApp API';
            messagesFailed++;
          }
        } catch (sendError) {
          console.error(`Error sending message to ${contact.phoneNumber}:`, sendError);
          message.status = 'FAILED';
          message.errorMessage = sendError.message;
          messagesFailed++;
        }

        await message.save();

        // Update contact statistics
        contact.lastMessageDate = new Date();
        contact.messageCount += 1;
        await contact.save();

        // Delay between messages to avoid rate limiting
        if (delayBetweenMessages > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenMessages));
        }

      } catch (error) {
        console.error(`Error processing contact ${contact._id}:`, error);
        messagesSkipped++;
      }
    }
    
    // Update campaign statistics after each batch
    await Campaign.findByIdAndUpdate(campaign._id, {
      'stats.messagesSent': messagesSent,
      'stats.messagesFailed': messagesFailed,
      'stats.messagesSkipped': messagesSkipped,
    });
    
    console.log(`Campaign ${campaign._id} - Batch ${Math.floor(i/batchSize) + 1} completed. Sent: ${messagesSent}, Failed: ${messagesFailed}, Skipped: ${messagesSkipped}`);
  }

  // Mark campaign as completed
  await Campaign.findByIdAndUpdate(campaign._id, {
    status: 'completed',
    endDate: new Date(),
    'stats.messagesSent': messagesSent,
    'stats.messagesFailed': messagesFailed,
    'stats.messagesSkipped': messagesSkipped,
  });

  console.log(`Campaign ${campaign._id} completed. Final stats - Sent: ${messagesSent}, Failed: ${messagesFailed}, Skipped: ${messagesSkipped}`);
}
