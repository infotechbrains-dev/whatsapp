import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  logo: {
    type: String, // URL to logo image
  },
  industry: {
    type: String,
    trim: true,
  },
  website: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  timezone: {
    type: String,
    default: 'UTC',
  },
  currency: {
    type: String,
    default: 'USD',
  },
  settings: {
    allowMultipleWABA: {
      type: Boolean,
      default: true,
    },
    defaultLanguage: {
      type: String,
      default: 'en_US',
    },
    brandColors: {
      primary: String,
      secondary: String,
    },
    businessHours: {
      start: String, // HH:MM format
      end: String,   // HH:MM format
      timezone: String,
      workdays: [String], // ['monday', 'tuesday', etc.]
    },
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'cancelled'],
      default: 'active',
    },
    expiresAt: Date,
    features: {
      maxWABA: {
        type: Number,
        default: 1,
      },
      maxTemplates: {
        type: Number,
        default: 10,
      },
      maxContacts: {
        type: Number,
        default: 1000,
      },
      maxMessagesPerMonth: {
        type: Number,
        default: 1000,
      },
      hasAPI: {
        type: Boolean,
        default: false,
      },
      hasAnalytics: {
        type: Boolean,
        default: false,
      },
      hasBulkMessaging: {
        type: Boolean,
        default: false,
      },
    },
  },
  usage: {
    currentWABA: {
      type: Number,
      default: 0,
    },
    currentTemplates: {
      type: Number,
      default: 0,
    },
    currentContacts: {
      type: Number,
      default: 0,
    },
    messagesThisMonth: {
      type: Number,
      default: 0,
    },
    lastUsageUpdate: {
      type: Date,
      default: Date.now,
    },
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  owners: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'manager', 'operator'],
      default: 'owner',
    },
    permissions: [{
      type: String,
      enum: [
        'manage_waba',
        'manage_templates', 
        'manage_campaigns',
        'manage_contacts',
        'view_analytics',
        'manage_users',
        'manage_settings'
      ],
    }],
    addedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  apiKeys: [{
    name: String,
    key: String,
    permissions: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsed: Date,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

// Indexes for performance
companySchema.index({ createdBy: 1 });
companySchema.index({ 'owners.userId': 1 });
companySchema.index({ status: 1 });
companySchema.index({ 'subscription.status': 1 });

// Virtual to get active owners
companySchema.virtual('activeOwners').get(function() {
  return this.owners.filter(owner => owner.status === 'active');
});

// Method to check if user has access to company
companySchema.methods.hasAccess = function(userId) {
  return this.owners.some(owner => 
    owner.userId.toString() === userId.toString()
  );
};

// Method to get user role in company
companySchema.methods.getUserRole = function(userId) {
  const owner = this.owners.find(owner => 
    owner.userId.toString() === userId.toString()
  );
  return owner ? owner.role : null;
};

// Method to check user permissions
companySchema.methods.hasPermission = function(userId, permission) {
  const owner = this.owners.find(owner => 
    owner.userId.toString() === userId.toString()
  );
  return owner ? owner.permissions.includes(permission) : false;
};

// Method to update usage stats
companySchema.methods.updateUsage = function(updates) {
  Object.assign(this.usage, updates);
  this.usage.lastUsageUpdate = new Date();
  return this.save();
};

// Static method to find companies by user
companySchema.statics.findByUser = function(userId) {
  return this.find({
    'owners.userId': userId,
    status: 'active'
  });
};

const Company = mongoose.models.Company || mongoose.model('Company', companySchema);

export default Company;
