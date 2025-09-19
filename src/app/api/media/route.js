import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MediaFile from '@/models/MediaFile';
import User from '@/models/User';
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

// GET /api/media - Get user's media files with pagination and filtering
export async function GET(request) {
  try {
    await dbConnect();
    
    const decoded = await verifyToken(request);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '12');
    const fileType = url.searchParams.get('type'); // image, video, document
    const search = url.searchParams.get('search');
    const tags = url.searchParams.get('tags');
    
    // Build query
    const query = { userId: user._id, status: 'ready' };
    
    if (fileType) {
      query.fileType = fileType;
    }
    
    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }

    const skip = (page - 1) * limit;
    
    const [mediaFiles, totalCount] = await Promise.all([
      MediaFile.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-s3Key'), // Don't expose S3 key
      MediaFile.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      mediaFiles,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching media files:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/media - Upload new media file
export async function POST(request) {
  try {
    await dbConnect();
    
    const decoded = await verifyToken(request);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const fileType = formData.get('fileType'); // image, video, document
    const description = formData.get('description') || '';
    const tags = formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : [];
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!fileType || !['image', 'video', 'document'].includes(fileType)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate file
    try {
      MediaFile.validateFile({
        size: file.size,
        mimetype: file.type
      }, fileType);
    } catch (validationError) {
      return NextResponse.json({ error: validationError.message }, { status: 400 });
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to S3
    const s3Url = await S3Service.uploadFile(
      buffer,
      uniqueFileName,
      file.type,
      `media/${fileType}s`
    );

    // Create media file record
    const mediaFile = new MediaFile({
      userId: user._id,
      originalName: file.name,
      fileName: uniqueFileName,
      mimeType: file.type,
      fileSize: file.size,
      fileType: fileType,
      s3Key: `media/${fileType}s/${uniqueFileName}`,
      s3Url: s3Url,
      description: description,
      tags: tags,
      status: 'ready'
    });

    await mediaFile.save();

    // Remove s3Key from response
    const responseFile = mediaFile.toObject();
    delete responseFile.s3Key;

    return NextResponse.json({ 
      message: 'File uploaded successfully',
      mediaFile: responseFile 
    });
  } catch (error) {
    console.error('Error uploading media file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
