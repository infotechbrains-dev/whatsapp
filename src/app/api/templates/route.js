import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Template from '@/models/Template';
import { getMultiTenantContext, getWhatsAppAPI, hasPermission } from '@/lib/auth-context';

// GET /api/templates - Fetch templates from WhatsApp API and sync with database
export async function GET(request) {
  try {
    await dbConnect();
    
    const context = await getMultiTenantContext(request);
    const { user, currentWABA, companyId, wabaId } = context;
    
    // If no WABA configured, return empty templates (instead of error)
    if (!currentWABA) {
      // Check if we have any local templates for this company
      const localTemplates = await Template.find({ companyId });
      return NextResponse.json({ 
        templates: localTemplates,
        message: 'No WhatsApp Business Account configured. Please add a WhatsApp number to sync templates.' 
      });
    }

    // Create WhatsApp API instance
    const whatsappAPI = getWhatsAppAPI(currentWABA);
    
    // Fetch templates from WhatsApp API
    let whatsappTemplates = [];
    try {
      whatsappTemplates = await whatsappAPI.fetchAllTemplates();
    } catch (whatsappError) {
      console.error('WhatsApp API error:', whatsappError.message);
      // Return local templates if WhatsApp API fails
      const localTemplates = await Template.find({ companyId, wabaId });
      return NextResponse.json({ 
        templates: localTemplates,
        message: `WhatsApp API error: ${whatsappError.message}. Showing cached templates.`,
        error: whatsappError.message
      });
    }
    
    // Sync with database
    const syncedTemplates = [];
    
    for (const whatsappTemplate of whatsappTemplates) {
      try {
        // Analyze template parameters
        const analysis = whatsappAPI.analyzeTemplateParameters(whatsappTemplate);
        
        // Update or create template in database
        const template = await Template.findOneAndUpdate(
          { 
            companyId,
            wabaId, 
            name: whatsappTemplate.name 
          },
          {
            userId: user._id,
            companyId,
            wabaId,
            name: whatsappTemplate.name,
            status: whatsappTemplate.status,
            language: whatsappTemplate.language || 'en_US',
            components: whatsappTemplate.components,
            headerType: analysis.headerType,
            headerRequiresParam: analysis.headerRequiresParam,
            bodyParameters: analysis.bodyParameters,
            buttonParameters: analysis.buttonParameters,
            description: analysis.description,
          },
          { upsert: true, new: true }
        );
        
        syncedTemplates.push(template);
      } catch (syncError) {
        console.error(`Error syncing template ${whatsappTemplate.name}:`, syncError);
      }
    }
    
    // Update WABA template count
    if (currentWABA) {
      await currentWABA.syncTemplatesCount();
    }
    
    return NextResponse.json({ templates: syncedTemplates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/templates - Create a new template
export async function POST(request) {
  try {
    await dbConnect();
    
    const context = await getMultiTenantContext(request);
    const { user, company, currentWABA, companyId, wabaId, userRole, userPermissions } = context;
    
    // Check permissions
    if (!hasPermission(userRole, userPermissions, 'manage_templates')) {
      return NextResponse.json({ error: 'No permission to manage templates' }, { status: 403 });
    }
    
    if (!currentWABA) {
      return NextResponse.json({ error: 'No WhatsApp Business Account configured' }, { status: 400 });
    }

    const templateData = await request.json();
    
    // Validate required fields
    if (!templateData.name || !templateData.category || !templateData.components) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check subscription limits
    const currentTemplateCount = await Template.countDocuments({ companyId, wabaId });
    if (currentTemplateCount >= company.subscription.features.maxTemplates) {
      return NextResponse.json({ 
        error: `Maximum template limit reached (${company.subscription.features.maxTemplates}). Upgrade your plan to create more templates.` 
      }, { status: 400 });
    }

    // Create WhatsApp API instance
    const whatsappAPI = getWhatsAppAPI(currentWABA);
    
    // Log the template data being sent to WhatsApp API
    console.log('Creating template with data:', {
      name: templateData.name,
      category: templateData.category,
      language: templateData.language || 'en_US',
      components: templateData.components
    });

    // Create template via WhatsApp API
    const whatsappResponse = await whatsappAPI.createTemplate({
      name: templateData.name,
      category: templateData.category,
      language: templateData.language || 'en_US',
      components: templateData.components
    });
    
    // Save template in database
    const template = new Template({
      userId: user._id,
      companyId,
      wabaId,
      name: templateData.name,
      status: 'PENDING',
      language: templateData.language || 'en_US',
      category: templateData.category,
      components: templateData.components,
      whatsappTemplateId: whatsappResponse.id,
    });
    
    await template.save();
    
    // Update company and WABA usage
    await company.updateUsage({ currentTemplates: currentTemplateCount + 1 });
    if (currentWABA) {
      await currentWABA.syncTemplatesCount();
    }
    
    return NextResponse.json({ template, whatsappResponse });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
