import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MediaFile from '@/models/MediaFile';
import User from '@/models/User';
import S3Service from '@/lib/s3';
import jwt from 'jsonwebtoken';

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

// POST /api/media/upload-complete - Mark upload as complete
export async function POST(request) {
  try {
    await dbConnect();
    
    const decoded = await verifyToken(request);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { mediaFileId, success = true } = await request.json();
    
    if (!mediaFileId) {
      return NextResponse.json({ error: 'Media file ID is required' }, { status: 400 });
    }

    const mediaFile = await MediaFile.findOne({
      _id: mediaFileId,
      userId: user._id
    });

    if (!mediaFile) {
      return NextResponse.json({ error: 'Media file not found' }, { status: 404 });
    }

    if (success) {
      // Verify file exists in S3
      try {
        const exists = await S3Service.fileExists(mediaFile.s3Key);
        if (!exists) {
          throw new Error('File not found in S3');
        }
        
        // Get file metadata from S3
        const metadata = await S3Service.getFileMetadata(mediaFile.s3Key);
        
        // Update media file status
        mediaFile.status = 'ready';
        mediaFile.fileSize = metadata.contentLength || mediaFile.fileSize;
        
        // TODO: Add image/video processing for thumbnails and metadata
        // This would typically involve services like AWS Lambda, ImageMagick, FFmpeg etc.
        
        await mediaFile.save();
        
        // Remove s3Key from response
        const responseFile = mediaFile.toObject();
        delete responseFile.s3Key;
        
        return NextResponse.json({
          message: 'Upload completed successfully',
          mediaFile: responseFile
        });
      } catch (error) {
        // File upload failed, mark as failed and clean up
        mediaFile.status = 'failed';
        await mediaFile.save();
        
        // Try to cleanup S3 file
        try {
          await S3Service.deleteFile(mediaFile.s3Key);
        } catch (cleanupError) {
          console.error('Error cleaning up failed upload:', cleanupError);
        }
        
        return NextResponse.json({ error: 'Upload verification failed' }, { status: 400 });
      }
    } else {
      // Upload failed, mark as failed and clean up
      mediaFile.status = 'failed';
      await mediaFile.save();
      
      // Try to cleanup S3 file
      try {
        await S3Service.deleteFile(mediaFile.s3Key);
      } catch (cleanupError) {
        console.error('Error cleaning up failed upload:', cleanupError);
      }
      
      return NextResponse.json({ message: 'Upload marked as failed' });
    }
  } catch (error) {
    console.error('Error completing upload:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
