import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

export class S3Service {
  /**
   * Upload file to S3
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - File name with extension
   * @param {string} contentType - MIME type
   * @param {string} folder - Optional folder path
   * @returns {Promise<string>} - S3 file URL
   */
  static async uploadFile(fileBuffer, fileName, contentType, folder = 'media') {
    if (!BUCKET_NAME) {
      throw new Error('AWS S3 bucket name not configured');
    }

    const key = folder ? `${folder}/${fileName}` : fileName;
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      //ACL: 'public-read', // Make files publicly accessible
    });

    try {
      await s3Client.send(command);
      return `https://${BUCKET_NAME}.s3.${process.env.AWS_S3_REGION || 'us-east-1'}.amazonaws.com/${key}`;
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  /**
   * Delete file from S3
   * @param {string} fileUrl - Full S3 URL or just the key
   * @returns {Promise<boolean>}
   */
  static async deleteFile(fileUrl) {
    if (!BUCKET_NAME) {
      throw new Error('AWS S3 bucket name not configured');
    }

    try {
      // Extract key from URL if full URL is provided
      let key;
      if (fileUrl.startsWith('https://')) {
        const url = new URL(fileUrl);
        key = url.pathname.substring(1); // Remove leading slash
      } else {
        key = fileUrl;
      }

      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw new Error('Failed to delete file from S3');
    }
  }

  /**
   * Generate presigned URL for file upload
   * @param {string} fileName - File name with extension
   * @param {string} contentType - MIME type
   * @param {string} folder - Optional folder path
   * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns {Promise<{uploadUrl: string, fileUrl: string}>}
   */
  static async generatePresignedUploadUrl(fileName, contentType, folder = 'media', expiresIn = 3600) {
    if (!BUCKET_NAME) {
      throw new Error('AWS S3 bucket name not configured');
    }

    const key = folder ? `${folder}/${fileName}` : fileName;
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      //ACL: 'public-read',
    });

    try {
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
      const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_S3_REGION || 'us-east-1'}.amazonaws.com/${key}`;
      
      return { uploadUrl, fileUrl, key };
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new Error('Failed to generate presigned URL');
    }
  }

  /**
   * Generate presigned URL for file download
   * @param {string} key - S3 object key
   * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns {Promise<string>}
   */
  static async generatePresignedDownloadUrl(key, expiresIn = 3600) {
    if (!BUCKET_NAME) {
      throw new Error('AWS S3 bucket name not configured');
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    try {
      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Error generating presigned download URL:', error);
      throw new Error('Failed to generate presigned download URL');
    }
  }

  /**
   * Check if file exists in S3
   * @param {string} key - S3 object key
   * @returns {Promise<boolean>}
   */
  static async fileExists(key) {
    if (!BUCKET_NAME) {
      throw new Error('AWS S3 bucket name not configured');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   * @param {string} key - S3 object key
   * @returns {Promise<object>}
   */
  static async getFileMetadata(key) {
    if (!BUCKET_NAME) {
      throw new Error('AWS S3 bucket name not configured');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(command);
      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        etag: response.ETag,
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error('Failed to get file metadata');
    }
  }
}

export default S3Service;
