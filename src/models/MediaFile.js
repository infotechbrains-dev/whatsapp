import mongoose from 'mongoose';

const mediaFileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  fileType: {
    type: String,
    enum: ['image', 'video', 'document'],
    required: true,
  },
  s3Key: {
    type: String,
    required: true,
    unique: true,
  },
  s3Url: {
    type: String,
    required: true,
  },
  thumbnailUrl: {
    type: String, // For videos and documents
  },
  metadata: {
    width: Number, // For images and videos
    height: Number, // For images and videos  
    duration: Number, // For videos
    pages: Number, // For documents
  },
  tags: [{
    type: String,
    trim: true,
  }],
  description: {
    type: String,
    maxLength: 500,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  lastUsedAt: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'ready', 'failed'],
    default: 'uploading',
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
mediaFileSchema.index({ userId: 1, fileType: 1 });
mediaFileSchema.index({ userId: 1, createdAt: -1 });
mediaFileSchema.index({ tags: 1 });
mediaFileSchema.index({ status: 1 });

// Virtual for file URL with cache busting
mediaFileSchema.virtual('fileUrl').get(function() {
  return this.s3Url;
});

// Static method to get file type from mime type
mediaFileSchema.statics.getFileTypeFromMimeType = function(mimeType) {
  if (mimeType.startsWith('image/')) {
    return 'image';
  } else if (mimeType.startsWith('video/')) {
    return 'video';
  } else {
    return 'document';
  }
};

// Static method to validate file type and size
mediaFileSchema.statics.validateFile = function(file, fileType) {
  const maxSizes = {
    image: 5 * 1024 * 1024, // 5MB
    video: 100 * 1024 * 1024, // 100MB
    document: 10 * 1024 * 1024, // 10MB
  };

  const allowedMimeTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ],
  };

  if (file.size > maxSizes[fileType]) {
    throw new Error(`File size exceeds ${maxSizes[fileType] / 1024 / 1024}MB limit for ${fileType} files`);
  }

  if (!allowedMimeTypes[fileType].includes(file.mimetype || file.type)) {
    throw new Error(`File type ${file.mimetype || file.type} not allowed for ${fileType} files`);
  }

  return true;
};

// Instance method to increment usage count
mediaFileSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

// Instance method to add tags
mediaFileSchema.methods.addTags = function(newTags) {
  if (Array.isArray(newTags)) {
    const uniqueTags = [...new Set([...this.tags, ...newTags])];
    this.tags = uniqueTags;
  } else if (typeof newTags === 'string') {
    if (!this.tags.includes(newTags)) {
      this.tags.push(newTags);
    }
  }
  return this.save();
};

// Pre-remove hook to clean up S3 files
mediaFileSchema.pre('remove', async function() {
  try {
    // Dynamic import to avoid circular dependency
    const S3Service = (await import('@/lib/s3')).default;
    await S3Service.deleteFile(this.s3Key);
    
    if (this.thumbnailUrl) {
      // Extract key from thumbnail URL and delete
      const thumbnailKey = this.thumbnailUrl.split('/').pop();
      await S3Service.deleteFile(`thumbnails/${thumbnailKey}`);
    }
  } catch (error) {
    console.error('Error cleaning up S3 files:', error);
  }
});

export default mongoose.models.MediaFile || mongoose.model('MediaFile', mediaFileSchema);
