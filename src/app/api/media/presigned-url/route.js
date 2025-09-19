import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import MediaFile from '@/models/MediaFile';
import S3Service from '@/lib/s3';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// Helper function to verify JWT token
async function verifyToken(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      throw new Error('No token provided');
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// POST /api/media/presigned-url - Generate presigned URL for direct upload to S3
export async function POST(request) {
  try {
    await dbConnect();
    
    const decoded = await verifyToken(request);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { fileName, fileType, mimeType, fileSize, description = '', tags = [] } = await request.json();
    
    if (!fileName || !fileType || !mimeType || !fileSize) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['image', 'video', 'document'].includes(fileType)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate file
    try {
      MediaFile.validateFile({
        size: fileSize,
        mimetype: mimeType
      }, fileType);
    } catch (validationError) {
      return NextResponse.json({ error: validationError.message }, { status: 400 });
    }

    // Generate unique filename
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    
    // Generate presigned URL
    const { uploadUrl, fileUrl, key } = await S3Service.generatePresignedUploadUrl(
      uniqueFileName,
      mimeType,
      `media/${fileType}s`
    );

    // Create media file record with uploading status
    const mediaFile = new MediaFile({
      userId: user._id,
      originalName: fileName,
      fileName: uniqueFileName,
      mimeType: mimeType,
      fileSize: fileSize,
      fileType: fileType,
      s3Key: key,
      s3Url: fileUrl,
      description: description,
      tags: Array.isArray(tags) ? tags : [],
      status: 'uploading'
    });

    await mediaFile.save();

    return NextResponse.json({
      uploadUrl,
      mediaFileId: mediaFile._id,
      fileUrl
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
