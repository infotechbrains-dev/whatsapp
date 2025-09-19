import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  wabaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WABA',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: String,
  messageType: {
    type: String,
    enum: ['template', 'text', 'image', 'video', 'document'],
    default: 'template',
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    required: function() {
      return this.messageType === 'template';
    },
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'],
    default: 'draft',
  },
  scheduledDate: Date,
  startDate: Date,
  endDate: Date,
  // Target audience
  contactIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
  }],
  contactFilters: {
    tags: [String],
    excludeUnsubscribed: {
      type: Boolean,
      default: true,
    },
    customFilters: mongoose.Schema.Types.Mixed,
  },
  // Template parameters
  headerValue: String,
  headerMediaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MediaFile',
  },
  bodyParameters: [String],
  // Direct message parameters
  textMessage: String,
  messageMediaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MediaFile',
  },
  // Statistics
  stats: {
    totalContacts: {
      type: Number,
      default: 0,
    },
    messagesSent: {
      type: Number,
      default: 0,
    },
    messagesDelivered: {
      type: Number,
      default: 0,
    },
    messagesRead: {
      type: Number,
      default: 0,
    },
    messagesFailed: {
      type: Number,
      default: 0,
    },
    messagesSkipped: {
      type: Number,
      default: 0,
    },
  },
  // Settings
  settings: {
    batchSize: {
      type: Number,
      default: 50,
    },
    delayBetweenMessages: {
      type: Number,
      default: 500, // milliseconds
    },
    retryFailedMessages: {
      type: Boolean,
      default: false,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
  },
}, {
  timestamps: true,
});

// Indexes
campaignSchema.index({ userId: 1, createdAt: -1 });
campaignSchema.index({ companyId: 1, createdAt: -1 });
campaignSchema.index({ wabaId: 1, createdAt: -1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ scheduledDate: 1 });

export default mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);
