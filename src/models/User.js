import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'super_admin'],
    default: 'user',
  },
  // Multi-tenant user preferences
  preferences: {
    currentCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    currentWABAId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WABA',
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light',
    },
    language: {
      type: String,
      default: 'en',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    notifications: {
      email: {
        campaigns: { type: Boolean, default: true },
        templates: { type: Boolean, default: true },
        system: { type: Boolean, default: true },
      },
      push: {
        campaigns: { type: Boolean, default: false },
        templates: { type: Boolean, default: false },
        system: { type: Boolean, default: true },
      },
    },
    dashboard: {
      defaultView: {
        type: String,
        enum: ['overview', 'campaigns', 'templates', 'contacts'],
        default: 'overview',
      },
      widgetPreferences: {
        showQuickStats: { type: Boolean, default: true },
        showRecentActivity: { type: Boolean, default: true },
        showUpcomingCampaigns: { type: Boolean, default: true },
      },
    },
  },
  // Company Access Control
  companies: [{
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'manager', 'operator', 'viewer'],
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
        'manage_settings',
        'manage_billing',
        'export_data'
      ],
    }],
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'suspended'],
      default: 'active',
    },
  }],
  // Personal subscription (for personal use)
  personalSubscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'pro'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'active',
    },
    expiresAt: Date,
  },
  // Legacy WhatsApp Config (will be migrated to WABA)
  whatsappConfig: {
    businessAccountId: String,
    accessToken: String,
    phoneNumberId: String,
    webhookVerifyToken: String,
    // Migration flag
    migrated: {
      type: Boolean,
      default: false,
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
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    messageLimit: {
      type: Number,
      default: 100, // Free tier limit
    },
    messagesUsed: {
      type: Number,
      default: 0,
    },
    resetDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  },
  // Security & Authentication
  security: {
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: String,
    backupCodes: [String],
    lastPasswordChange: Date,
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: Date,
  },
  // Account Status
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Activity Tracking
  activity: {
    lastLogin: Date,
    lastSeen: Date,
    loginCount: {
      type: Number,
      default: 0,
    },
    lastCompanySwitch: Date,
    ipAddresses: [{
      ip: String,
      location: String,
      lastUsed: Date,
    }],
  },
  
  lastLogin: Date, // Keep for backward compatibility
  
  isActive: {
    type: Boolean,
    default: true,
  },
  
  // Soft delete
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Hash password before saving and initialize preferences
userSchema.pre('save', async function(next) {
  // Initialize preferences if not set
  if (!this.preferences) {
    this.preferences = {};
  }
  
  // Initialize companies array if not set
  if (!this.companies) {
    this.companies = [];
  }
  
  // Hash password if modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes for performance
// Note: email index is already created by unique: true in schema
userSchema.index({ verificationToken: 1 });
userSchema.index({ resetPasswordToken: 1 });
userSchema.index({ 'companies.companyId': 1 });
userSchema.index({ 'preferences.currentCompanyId': 1 });
userSchema.index({ isActive: 1, deletedAt: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Virtual for active companies
userSchema.virtual('activeCompanies').get(function() {
  return this.companies.filter(company => company.status === 'active');
});

// Method to check if user has access to company
userSchema.methods.hasCompanyAccess = function(companyId) {
  return this.companies.some(company => 
    company.companyId.toString() === companyId.toString() && 
    company.status === 'active'
  );
};

// Method to get user role in specific company
userSchema.methods.getCompanyRole = function(companyId) {
  const company = this.companies.find(company => 
    company.companyId.toString() === companyId.toString() && 
    company.status === 'active'
  );
  return company ? company.role : null;
};

// Method to check user permissions in company
userSchema.methods.hasPermission = function(companyId, permission) {
  const company = this.companies.find(company => 
    company.companyId.toString() === companyId.toString() && 
    company.status === 'active'
  );
  
  if (!company) return false;
  
  // Owners and admins have all permissions
  if (['owner', 'admin'].includes(company.role)) return true;
  
  return company.permissions.includes(permission);
};

// Method to add user to company
userSchema.methods.addToCompany = function(companyId, role = 'operator', permissions = [], invitedBy = null) {
  // Check if already in company
  const existingCompany = this.companies.find(company => 
    company.companyId.toString() === companyId.toString()
  );
  
  if (existingCompany) {
    // Update existing company access
    existingCompany.role = role;
    existingCompany.permissions = permissions;
    existingCompany.status = 'active';
    existingCompany.invitedBy = invitedBy;
  } else {
    // Add new company access
    this.companies.push({
      companyId,
      role,
      permissions,
      invitedBy,
      status: 'active',
    });
  }
  
  // Set as current company if user doesn't have one
  if (!this.preferences.currentCompanyId) {
    this.preferences.currentCompanyId = companyId;
  }
  
  return this.save();
};

// Method to remove user from company
userSchema.methods.removeFromCompany = function(companyId) {
  this.companies = this.companies.filter(company => 
    company.companyId.toString() !== companyId.toString()
  );
  
  // If current company was removed, switch to another company
  if (this.preferences.currentCompanyId?.toString() === companyId.toString()) {
    const firstCompany = this.activeCompanies[0];
    this.preferences.currentCompanyId = firstCompany ? firstCompany.companyId : null;
    this.preferences.currentWABAId = null; // Reset WABA when switching companies
  }
  
  return this.save();
};

// Method to switch current company
userSchema.methods.switchCompany = function(companyId, wabaId = null) {
  if (!this.hasCompanyAccess(companyId)) {
    throw new Error('No access to this company');
  }
  
  this.preferences.currentCompanyId = companyId;
  this.preferences.currentWABAId = wabaId;
  this.activity.lastCompanySwitch = new Date();
  
  return this.save();
};

// Method to update last activity
userSchema.methods.updateActivity = function(data = {}) {
  Object.assign(this.activity, {
    lastSeen: new Date(),
    ...data
  });
  return this.save();
};

// Static method to find users by company
userSchema.statics.findByCompany = function(companyId, options = {}) {
  const query = {
    'companies.companyId': companyId,
    'companies.status': 'active',
    isActive: true,
    deletedAt: null,
  };
  
  return this.find(query, null, options);
};

// Method to check if account is locked
userSchema.methods.isLocked = function() {
  return !!(this.security.lockedUntil && this.security.lockedUntil > Date.now());
};

// Method to increment failed login attempts
userSchema.methods.incrementLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.security.lockedUntil && this.security.lockedUntil < Date.now()) {
    return this.updateOne({
      $unset: { 'security.lockedUntil': 1 },
      $set: { 'security.failedLoginAttempts': 1 }
    });
  }
  
  const updates = { $inc: { 'security.failedLoginAttempts': 1 } };
  
  // Lock account after 5 attempts for 2 hours
  if (this.security.failedLoginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { 'security.lockedUntil': Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      'security.failedLoginAttempts': 1,
      'security.lockedUntil': 1
    }
  });
};

userSchema.set('toJSON', { virtuals: true });

export default mongoose.models.User || mongoose.model('User', userSchema);
