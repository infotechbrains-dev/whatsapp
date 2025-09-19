import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
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
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true,
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
  },
  replyToMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  whatsappMessageId: String,
  phoneNumber: {
    type: String,
    required: true,
  },
  normalizedPhoneNumber: {
    type: String,
    required: true,
    index: true,
  },
  direction: {
    type: String,
    enum: ['outbound', 'inbound'],
    required: true,
  },
  type: {
    type: String,
    enum: ['template', 'text', 'image', 'video', 'document', 'audio'],
    required: true,
  },
  status: {
    type: String,
    enum: ['SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'ERROR', 'SKIPPED'],
    default: 'SENDING',
  },
  content: {
    text: String,
    mediaUrl: String,
    mediaId: String,
    templateName: String,
    templateLanguage: String,
    headerValue: String,
    bodyParameters: [String],
  },
  scheduledDate: Date,
  sentDate: Date,
  deliveredDate: Date,
  readDate: Date,
  failureReason: String,
  errorMessage: String,
  cost: Number,
  // For webhook status updates
  webhookEvents: [{
    status: String,
    timestamp: Date,
    errorCode: String,
    errorMessage: String,
  }],
}, {
  timestamps: true,
});

// Normalize phone number before saving
messageSchema.pre('save', function(next) {
  if (this.phoneNumber) {
    this.normalizedPhoneNumber = this.phoneNumber.replace(/\D/g, '');
  }
  next();
});

// Indexes for efficient queries
messageSchema.index({ userId: 1, createdAt: -1 });
messageSchema.index({ companyId: 1, createdAt: -1 });
messageSchema.index({ wabaId: 1, createdAt: -1 });
messageSchema.index({ contactId: 1, createdAt: -1 });
messageSchema.index({ whatsappMessageId: 1 });
messageSchema.index({ normalizedPhoneNumber: 1, direction: 1 });
messageSchema.index({ status: 1 });
messageSchema.index({ scheduledDate: 1 });

export default mongoose.models.Message || mongoose.model('Message', messageSchema);
