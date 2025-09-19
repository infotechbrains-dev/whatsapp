import axios from 'axios';

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v19.0';
const BASE_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

class WhatsAppAPI {
  constructor(accessToken, phoneNumberId, businessAccountId) {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
    this.businessAccountId = businessAccountId;
    
    this.axios = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Fetch all message templates with details and pagination support
   */
  async fetchAllTemplates() {
    try {
      const allTemplates = [];
      let url = `/${this.businessAccountId}/message_templates?fields=name,status,language,components,category,quality_score&limit=100`;
      
      while (url) {
        const response = await this.axios.get(url);
        
        if (response.data && response.data.data) {
          // Add additional status information to each template
          const templatesWithStatus = response.data.data.map(template => ({
            ...template,
            statusDisplay: this.getTemplateStatusDisplay(template.status),
            isApproved: template.status === 'APPROVED',
            isPending: template.status === 'PENDING',
            isRejected: template.status === 'REJECTED',
          }));
          
          allTemplates.push(...templatesWithStatus);
          
          // Check for next page
          url = response.data.paging && response.data.paging.next 
            ? response.data.paging.next.replace(BASE_URL, '')
            : null;
        } else {
          break;
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      return allTemplates;
    } catch (error) {
      console.error('Error fetching templates:', error.response?.data || error.message);
      
      // Check if it's a permissions error and provide more helpful message
      if (error.response?.data?.error?.code === 100) {
        throw new Error(`WhatsApp API Error: ${error.response.data.error.message}. Please check your Business Account ID and access token permissions.`);
      }
      
      throw new Error(`Failed to fetch templates: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get user-friendly template status display
   */
  getTemplateStatusDisplay(status) {
    switch (status) {
      case 'APPROVED':
        return { text: 'Approved', color: 'green' };
      case 'PENDING':
        return { text: 'Pending Review', color: 'yellow' };
      case 'REJECTED':
        return { text: 'Rejected', color: 'red' };
      case 'DISABLED':
        return { text: 'Disabled', color: 'gray' };
      case 'PAUSED':
        return { text: 'Paused', color: 'orange' };
      case 'PENDING_DELETION':
        return { text: 'Pending Deletion', color: 'red' };
      default:
        return { text: status || 'Unknown', color: 'gray' };
    }
  }

  /**
   * Fetch specific template details by name
   */
  async fetchTemplateDetails(templateName) {
    try {
      const encodedName = encodeURIComponent(templateName);
      const response = await this.axios.get(
        `/${this.businessAccountId}/message_templates?fields=name,components,language,status&name=${encodedName}&limit=1`
      );
      
      if (response.data?.data?.length > 0 && response.data.data[0].name === templateName) {
        return response.data.data[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching template details:', error.response?.data || error.message);
      throw new Error(`Failed to fetch template details: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Analyze template parameters similar to Google Apps Script
   */
  analyzeTemplateParameters(template) {
    const result = {
      name: template.name,
      language: template.language || "en_US",
      description: "",
      bodyParameters: [],
      buttonParameters: [],
      hasHeader: false,
      headerType: null,
      headerRequiresParam: false
    };

    if (!template.components) {
      return result;
    }

    template.components.forEach(component => {
      // Header Analysis
      if (component.type === "HEADER") {
        result.hasHeader = true;
        result.headerType = component.format;

        if (component.format === "TEXT" && component.text?.includes("{{1}}")) {
          result.headerRequiresParam = true;
        } else if (["IMAGE", "VIDEO", "DOCUMENT"].includes(component.format)) {
          result.headerRequiresParam = true;
        } else if (component.format === "LOCATION") {
          result.headerRequiresParam = true;
        }
      }
      // Body Analysis
      else if (component.type === "BODY" && component.text) {
        result.description = component.text.substring(0, 200) + 
          (component.text.length > 200 ? '...' : '');
        
        const matches = component.text.match(/{{(\d+)}}/g) || [];
        matches.forEach(match => {
          const paramNumber = match.replace(/[{}]/g, '');
          if (!result.bodyParameters.some(p => p.key === paramNumber)) {
            result.bodyParameters.push({
              key: paramNumber,
              name: `Parameter ${paramNumber}`,
              description: `Body placeholder for {{${paramNumber}}}`
            });
          }
        });
      }
      // Button Analysis
      else if (component.type === "BUTTONS") {
        const buttons = component.buttons || [];
        buttons.forEach((button, index) => {
          if (button.type === 'URL' && button.url?.includes("{{")) {
            result.buttonParameters.push({ 
              index: index, 
              type: 'url_variable', 
              sub_type: 'url' 
            });
          }
        });
      }
    });

    // Sort body parameters numerically
    result.bodyParameters.sort((a, b) => parseInt(a.key) - parseInt(b.key));

    return result;
  }

  /**
   * Send a single template message
   */
  async sendTemplateMessage({
    phoneNumber,
    templateName,
    languageCode = 'en_US',
    headerValue = null,
    bodyParameters = [],
    templateAnalysis = null
  }) {
    try {
      // Normalize phone number (ensure it starts with + or country code)
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      const payload = {
        messaging_product: "whatsapp",
        to: normalizedPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components: []
        }
      };

      // Add header component if needed
      if (templateAnalysis?.headerRequiresParam && headerValue) {
        const headerComponent = { type: "header", parameters: [] };
        
        switch (templateAnalysis.headerType) {
          case 'TEXT':
            headerComponent.parameters.push({
              type: "text",
              text: String(headerValue)
            });
            break;
          case 'IMAGE':
          case 'VIDEO':
          case 'DOCUMENT':
            const mediaType = templateAnalysis.headerType.toLowerCase();
            headerComponent.parameters.push({
              type: mediaType,
              [mediaType]: { link: this.processMediaUrl(headerValue) }
            });
            break;
        }
        
        if (headerComponent.parameters.length > 0) {
          payload.template.components.push(headerComponent);
        }
      }

      // Add body component if needed
      if (templateAnalysis?.bodyParameters?.length > 0 && bodyParameters?.length > 0) {
        const bodyComponent = {
          type: "body",
          parameters: bodyParameters.map(param => ({
            type: "text",
            text: String(param || '')
          }))
        };
        payload.template.components.push(bodyComponent);
      }

      const response = await this.axios.post(`/${this.phoneNumberId}/messages`, payload);
      
      return response.data;
    } catch (error) {
      console.error('Error sending template message:', error.response?.data || error.message);
      throw new Error(`Failed to send message: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Send a text message
   */
  async sendTextMessage(phoneNumber, text) {
    try {
      // Normalize phone number (ensure it starts with + or country code)
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      const payload = {
        messaging_product: "whatsapp",
        to: normalizedPhone,
        type: "text",
        text: { body: text }
      };

      const response = await this.axios.post(`/${this.phoneNumberId}/messages`, payload);
      return response.data;
    } catch (error) {
      console.error('Error sending text message:', error.response?.data || error.message);
      throw new Error(`Failed to send text message: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Send media message (image, video, document)
   */
  async sendMediaMessage(phoneNumber, mediaUrl, mediaType, caption = null) {
    try {
      // Normalize phone number
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      const payload = {
        messaging_product: "whatsapp",
        to: normalizedPhone,
        type: mediaType,
        [mediaType]: {
          link: mediaUrl
        }
      };

      // Add caption if provided
      if (caption && caption.trim()) {
        payload[mediaType].caption = caption.trim();
      }

      const response = await this.axios.post(`/${this.phoneNumberId}/messages`, payload);
      return response.data;
    } catch (error) {
      console.error('Error sending media message:', error.response?.data || error.message);
      throw new Error(`Failed to send media message: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Normalize phone number for WhatsApp API
   */
  normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    
    // Remove all non-digit characters except +
    let normalized = phoneNumber.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +, assume it needs country code
    if (!normalized.startsWith('+')) {
      // If it starts with a digit, add + prefix
      if (/^\d/.test(normalized)) {
        normalized = '+' + normalized;
      }
    }
    
    // Remove + for WhatsApp API (it expects just numbers)
    return normalized.replace(/^\+/, '');
  }

  /**
   * Process media URL for Google Drive links
   */
  processMediaUrl(url) {
    if (!url || typeof url !== 'string') {
      return null;
    }

    const trimmedUrl = url.trim();
    
    // Check if it's a Google Drive link
    const fileIdMatch = trimmedUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
    }

    // Check for other Google Drive formats
    const ucMatch = trimmedUrl.match(/drive\.google\.com\/(?:uc|open)\?id=([a-zA-Z0-9_-]+)/);
    if (ucMatch && ucMatch[1]) {
      return `https://drive.google.com/uc?export=download&id=${ucMatch[1]}`;
    }

    // Return as-is if it's a valid HTTP(S) URL
    if (trimmedUrl.toLowerCase().startsWith('http://') || 
        trimmedUrl.toLowerCase().startsWith('https://')) {
      return trimmedUrl;
    }

    return null;
  }

  /**
   * Create a message template
   */
  async createTemplate(templateData) {
    try {
      const response = await this.axios.post(
        `/${this.businessAccountId}/message_templates`,
        templateData
      );
      return response.data;
    } catch (error) {
      console.error('Error creating template:', error.response?.data || error.message);
      throw new Error(`Failed to create template: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Delete a message template
   */
  async deleteTemplate(templateName) {
    try {
      const response = await this.axios.delete(
        `/${this.businessAccountId}/message_templates`,
        { data: { name: templateName } }
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting template:', error.response?.data || error.message);
      throw new Error(`Failed to delete template: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

/**
 * Create WhatsApp API instance from user configuration
 */
export function createWhatsAppAPI(userConfig) {
  const {
    accessToken = process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID,
    businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
  } = userConfig || {};

  if (!accessToken || !phoneNumberId || !businessAccountId) {
    throw new Error('Missing WhatsApp API configuration');
  }

  return new WhatsAppAPI(accessToken, phoneNumberId, businessAccountId);
}

export default WhatsAppAPI;
