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

// GET /api/media/[id] - Get specific media file
export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const decoded = await verifyToken(request);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const mediaFile = await MediaFile.findOne({
      _id: params.id,
      userId: user._id
    }).select('-s3Key');

    if (!mediaFile) {
      return NextResponse.json({ error: 'Media file not found' }, { status: 404 });
    }

    return NextResponse.json({ mediaFile });
  } catch (error) {
    console.error('Error fetching media file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/media/[id] - Update media file metadata
export async function PUT(request, { params }) {
  try {
    await dbConnect();
    
    const decoded = await verifyToken(request);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData = await request.json();
    const { description, tags, isPublic } = updateData;

    const mediaFile = await MediaFile.findOne({
      _id: params.id,
      userId: user._id
    });

    if (!mediaFile) {
      return NextResponse.json({ error: 'Media file not found' }, { status: 404 });
    }

    // Update fields if provided
    if (description !== undefined) {
      mediaFile.description = description;
    }
    
    if (tags !== undefined) {
      mediaFile.tags = Array.isArray(tags) ? tags : [];
    }
    
    if (isPublic !== undefined) {
      mediaFile.isPublic = isPublic;
    }

    await mediaFile.save();

    // Remove s3Key from response
    const responseFile = mediaFile.toObject();
    delete responseFile.s3Key;

    return NextResponse.json({ 
      message: 'Media file updated successfully',
      mediaFile: responseFile 
    });
  } catch (error) {
    console.error('Error updating media file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/media/[id] - Delete media file
export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    
    const decoded = await verifyToken(request);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const mediaFile = await MediaFile.findOne({
      _id: params.id,
      userId: user._id
    });

    if (!mediaFile) {
      return NextResponse.json({ error: 'Media file not found' }, { status: 404 });
    }

    // Delete from S3
    try {
      await S3Service.deleteFile(mediaFile.s3Key);
      
      // Delete thumbnail if exists
      if (mediaFile.thumbnailUrl) {
        const thumbnailKey = mediaFile.thumbnailUrl.split('/').slice(-2).join('/'); // Get last two parts
        await S3Service.deleteFile(thumbnailKey);
      }
    } catch (s3Error) {
      console.error('Error deleting from S3:', s3Error);
      // Continue with database deletion even if S3 deletion fails
    }

    // Delete from database
    await MediaFile.findByIdAndDelete(mediaFile._id);

    return NextResponse.json({ message: 'Media file deleted successfully' });
  } catch (error) {
    console.error('Error deleting media file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
