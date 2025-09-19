import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
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
  phoneNumber: {
    type: String,
    required: true,
  },
  normalizedPhoneNumber: {
    type: String,
    required: true,
    index: true,
  },
  firstName: String,
  lastName: String,
  email: String,
  tags: [String],
  customFields: [{
    name: String,
    value: String,
  }],
  isUnsubscribed: {
    type: Boolean,
    default: false,
  },
  unsubscribeDate: Date,
  lastMessageDate: Date,
  messageCount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['active', 'blocked', 'invalid'],
    default: 'active',
  },
}, {
  timestamps: true,
});

// Normalize phone number before saving
contactSchema.pre('save', function(next) {
  if (this.phoneNumber) {
    this.normalizedPhoneNumber = this.phoneNumber.replace(/\D/g, '');
  }
  next();
});

// Index for efficient queries
contactSchema.index({ userId: 1, normalizedPhoneNumber: 1 }, { unique: true });
contactSchema.index({ companyId: 1, normalizedPhoneNumber: 1 }, { unique: true });
contactSchema.index({ companyId: 1, isUnsubscribed: 1 });
contactSchema.index({ userId: 1, isUnsubscribed: 1 });
contactSchema.index({ tags: 1 });

// Virtual for full name
contactSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || this.phoneNumber;
});

contactSchema.set('toJSON', { virtuals: true });

export default mongoose.models.Contact || mongoose.model('Contact', contactSchema);
