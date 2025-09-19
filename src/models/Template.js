import mongoose from 'mongoose';

const templateParameterSchema = new mongoose.Schema({
  key: String,
  name: String,
  description: String,
});

const templateSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'PAUSED'],
    default: 'PENDING',
  },
  language: {
    type: String,
    default: 'en_US',
  },
  category: {
    type: String,
    required: true,
  },
  components: [{
    type: {
      type: String,
      enum: ['HEADER', 'BODY', 'FOOTER', 'BUTTONS'],
      required: true,
    },
    format: String, // For HEADER: TEXT, IMAGE, VIDEO, DOCUMENT, LOCATION
    text: String,
    example: mongoose.Schema.Types.Mixed,
    buttons: [{
      type: String,
      text: String,
      url: String,
    }],
  }],
  // Analysis from the Google Apps Script
  headerType: String,
  headerRequiresParam: {
    type: Boolean,
    default: false,
  },
  bodyParameters: [templateParameterSchema],
  buttonParameters: [templateParameterSchema],
  description: String,
  // Meta WhatsApp API Response
  whatsappTemplateId: String,
  qualityScore: {
    score: String,
    date: Date,
  },
  rejectionReason: String,
}, {
  timestamps: true,
});

// Index for efficient queries
templateSchema.index({ userId: 1, name: 1 }, { unique: true });
templateSchema.index({ companyId: 1, wabaId: 1, name: 1 }, { unique: true });
templateSchema.index({ companyId: 1 });
templateSchema.index({ wabaId: 1 });
templateSchema.index({ status: 1 });

export default mongoose.models.Template || mongoose.model('Template', templateSchema);
