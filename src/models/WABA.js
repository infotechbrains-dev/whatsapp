import mongoose from 'mongoose';

const wabaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  // WhatsApp API Configuration
  whatsappConfig: {
    accessToken: {
      type: String,
      required: true,
    },
    businessAccountId: {
      type: String,
      required: true,
    },
    phoneNumberId: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    displayPhoneNumber: {
      type: String,
      required: true,
    },
    webhookVerifyToken: String,
    apiVersion: {
      type: String,
      default: 'v19.0',
    },
    qualityRating: {
      type: String,
      enum: ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    namingStatus: {
      type: String,
      enum: ['APPROVED', 'PENDING', 'REJECTED', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'UNVERIFIED', 'PENDING'],
      default: 'UNVERIFIED',
    },
  },
  // Business Profile Information
  businessProfile: {
    about: String,
    address: String,
    description: String,
    email: String,
    profilePictureUrl: String,
    websites: [String],
    vertical: {
      type: String,
      enum: [
        'UNDEFINED', 'OTHER', 'AUTO', 'BEAUTY', 'APPAREL', 'EDU', 'ENTERTAIN', 
        'EVENT_PLAN', 'FINANCE', 'GROCERY', 'GOVT', 'HOTEL', 'HEALTH', 'NONPROFIT', 
        'PROF_SERVICES', 'RETAIL', 'TRAVEL', 'RESTAURANT', 'NOT_A_BIZ'
      ],
      default: 'OTHER',
    },
  },
  // Rate Limits and Quotas
  rateLimits: {
    messaging: {
      tier: {
        type: String,
        enum: ['TIER_NOT_SET', 'TIER_1K', 'TIER_10K', 'TIER_100K', 'TIER_UNLIMITED'],
        default: 'TIER_1K',
      },
      level: {
        type: Number,
        default: 250,
      },
    },
    templateCreation: {
      limit: {
        type: Number,
        default: 250,
      },
      used: {
        type: Number,
        default: 0,
      },
      resetAt: Date,
    },
  },
  // Usage Statistics
  usage: {
    messagesThisMonth: {
      type: Number,
      default: 0,
    },
    templatesCount: {
      type: Number,
      default: 0,
    },
    contactsCount: {
      type: Number,
      default: 0,
    },
    campaignsSent: {
      type: Number,
      default: 0,
    },
    lastMessageSent: Date,
    lastUsageUpdate: {
      type: Date,
      default: Date.now,
    },
    monthlyStats: [{
      month: String, // YYYY-MM format
      messagesSent: Number,
      templatesCreated: Number,
      campaignsLaunched: Number,
    }],
  },
  // Webhook Configuration
  webhook: {
    url: String,
    events: [{
      type: String,
      enum: ['messages', 'message_deliveries', 'message_reads', 'message_reactions'],
    }],
    isActive: {
      type: Boolean,
      default: false,
    },
    lastPing: Date,
    failureCount: {
      type: Number,
      default: 0,
    },
  },
  // Template Management
  templates: {
    total: {
      type: Number,
      default: 0,
    },
    approved: {
      type: Number,
      default: 0,
    },
    pending: {
      type: Number,
      default: 0,
    },
    rejected: {
      type: Number,
      default: 0,
    },
    lastSync: Date,
  },
  // Status and Health
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'setup_required'],
    default: 'setup_required',
  },
  healthStatus: {
    isConnected: {
      type: Boolean,
      default: false,
    },
    lastHealthCheck: Date,
    connectionError: String,
    alerts: [{
      type: {
        type: String,
        enum: ['warning', 'error', 'info'],
      },
      message: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
      resolved: {
        type: Boolean,
        default: false,
      },
    }],
  },
  // Security and Access
  security: {
    allowedIPs: [String],
    requireWebhookVerification: {
      type: Boolean,
      default: true,
    },
    encryptionEnabled: {
      type: Boolean,
      default: false,
    },
  },
  // Default settings for this WABA
  defaultSettings: {
    templateLanguage: {
      type: String,
      default: 'en_US',
    },
    templateCategory: {
      type: String,
      enum: ['MARKETING', 'UTILITY', 'AUTHENTICATION'],
      default: 'MARKETING',
    },
    autoReply: {
      enabled: {
        type: Boolean,
        default: false,
      },
      message: String,
      businessHoursOnly: {
        type: Boolean,
        default: true,
      },
    },
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Compound indexes for performance
wabaSchema.index({ companyId: 1, status: 1 });
wabaSchema.index({ companyId: 1, isDefault: 1 });
wabaSchema.index({ 'whatsappConfig.phoneNumber': 1 });
wabaSchema.index({ 'whatsappConfig.businessAccountId': 1 });

// Virtual to get formatted phone number
wabaSchema.virtual('formattedPhoneNumber').get(function() {
  const phone = this.whatsappConfig.displayPhoneNumber;
  if (!phone) return '';
  
  // Format phone number for display
  if (phone.startsWith('+')) {
    return phone;
  }
  return `+${phone}`;
});

// Method to test WhatsApp API connection
wabaSchema.methods.testConnection = async function() {
  try {
    // Import here to avoid circular dependency
    const { createWhatsAppAPI } = await import('../lib/whatsapp');
    const whatsappAPI = createWhatsAppAPI(this.whatsappConfig);
    
    // Try to fetch templates to test connection
    await whatsappAPI.fetchAllTemplates();
    
    this.healthStatus.isConnected = true;
    this.healthStatus.lastHealthCheck = new Date();
    this.healthStatus.connectionError = null;
    
    return { success: true };
  } catch (error) {
    this.healthStatus.isConnected = false;
    this.healthStatus.lastHealthCheck = new Date();
    this.healthStatus.connectionError = error.message;
    
    // Add alert
    this.healthStatus.alerts.push({
      type: 'error',
      message: `Connection failed: ${error.message}`,
    });
    
    return { success: false, error: error.message };
  } finally {
    await this.save();
  }
};

// Method to sync templates count
wabaSchema.methods.syncTemplatesCount = async function() {
  try {
    // Import here to avoid circular dependency
    const Template = (await import('./Template')).default;
    const templates = await Template.find({ 
      companyId: this.companyId,
      wabaId: this._id 
    });
    
    const approved = templates.filter(t => t.status === 'APPROVED').length;
    const pending = templates.filter(t => t.status === 'PENDING').length;
    const rejected = templates.filter(t => t.status === 'REJECTED').length;
    
    this.templates = {
      total: templates.length,
      approved,
      pending,
      rejected,
      lastSync: new Date(),
    };
    
    await this.save();
    return this.templates;
  } catch (error) {
    console.error('Error syncing templates count:', error);
    throw error;
  }
};

// Method to update usage statistics
wabaSchema.methods.updateUsage = function(updates) {
  Object.assign(this.usage, updates);
  this.usage.lastUsageUpdate = new Date();
  return this.save();
};

// Method to set as default WABA for company
wabaSchema.methods.setAsDefault = async function() {
  // Remove default flag from other WABAs in the same company
  await this.constructor.updateMany(
    { companyId: this.companyId, _id: { $ne: this._id } },
    { isDefault: false }
  );
  
  // Set this as default
  this.isDefault = true;
  return this.save();
};

// Static method to find WABAs by company
wabaSchema.statics.findByCompany = function(companyId, options = {}) {
  const query = { companyId, status: 'active' };
  
  if (options.includeInactive) {
    delete query.status;
  }
  
  return this.find(query).sort({ isDefault: -1, createdAt: -1 });
};

// Static method to find default WABA for company
wabaSchema.statics.findDefaultByCompany = function(companyId) {
  return this.findOne({ companyId, isDefault: true, status: 'active' });
};

// Pre-save middleware to ensure only one default WABA per company
wabaSchema.pre('save', async function(next) {
  if (this.isNew && this.isDefault) {
    // If this is a new default WABA, remove default flag from others
    await this.constructor.updateMany(
      { companyId: this.companyId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

const WABA = mongoose.models.WABA || mongoose.model('WABA', wabaSchema);

export default WABA;
