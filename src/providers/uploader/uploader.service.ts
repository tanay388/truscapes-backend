// uploader.service.ts
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { getStorage } from 'firebase-admin/storage';
import { FirebaseService } from '../firebase/firebase.service';

export interface UploadedMulterFileI {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

type UploaderInput = {
  name?: string;
  contentType?: string;
};

@Injectable()
export class UploaderService {
  private readonly storage;
  private readonly bucket;

  constructor(private readonly firebaseService: FirebaseService) {
    this.storage = getStorage(this.firebaseService.app);
    this.bucket = this.storage.bucket(process.env.FIREBASE_STORAGE_BUCKET);
  }

  async uploadFile(
    file: UploadedMulterFileI | string,
    path = 'main',
    { name, contentType }: UploaderInput = {},
  ): Promise<string> {
    try {
      const data = typeof file === 'string' ? Buffer.from(file) : file.buffer;
      name ??= typeof file === 'string' ? 'file' : file.originalname;

      // Sanitize filename by removing/replacing special characters
      const sanitizedName = this.sanitizeFileName(name);

      // Generate unique filename
      const fileName = `${crypto
        .randomBytes(32)
        .toString('base64url')}-${sanitizedName}`;
      const fullPath = `${path}/${fileName}`;

      // Create file in bucket
      const fileRef = this.bucket.file(fullPath);

      // Upload file with metadata
      await fileRef.save(data, {
        metadata: {
          contentType:
            contentType ||
            (typeof file === 'string'
              ? 'application/octet-stream'
              : file.mimetype),
        },
      });

      // Make the file publicly accessible
      await fileRef.makePublic();

      // Get the public URL with proper encoding
      const encodedPath = encodeURIComponent(fullPath);
      const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${encodedPath}`;

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file to Firebase Storage:', error);
      throw error;
    }
  }

  /**
   * Sanitizes filename by removing or replacing special characters that can cause URL issues
   */
  private sanitizeFileName(fileName: string): string {
    // Remove or replace problematic characters
    return fileName
      .replace(/[\s]+/g, '_') // Replace spaces with underscores
      .replace(/[%22|!@'"\\/<>:*?|]/g, '') // Remove problematic special characters
      .replace(/[,;]/g, '_') // Replace commas and semicolons with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single underscore
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .substring(0, 100); // Limit filename length
  }

   /**
    * Fixes existing URLs with special characters by properly encoding them
    * Use this for files that were uploaded before the sanitization fix
    */
   fixExistingUrl(invalidUrl: string): string {
     try {
       const url = new URL(invalidUrl);
       const bucketName = url.hostname.split('.')[0]; // Extract bucket name from hostname
       const pathParts = url.pathname.split('/');
       
       // Reconstruct the path by encoding each part
       const encodedPath = pathParts
         .filter(part => part) // Remove empty parts
         .map(part => encodeURIComponent(part))
         .join('/');
       
       return `https://storage.googleapis.com/${bucketName}/${encodedPath}`;
     } catch (error) {
       console.error('Error fixing URL:', error);
       return invalidUrl; // Return original if parsing fails
     }
   }

   /**
    * Alternative method to access files using Firebase Storage's signed URL
    * This bypasses URL encoding issues by generating a new access URL
    */
   async getSignedUrl(filePath: string, expiresInMinutes: number = 60): Promise<string> {
     try {
       const file = this.bucket.file(filePath);
       const [signedUrl] = await file.getSignedUrl({
         action: 'read',
         expires: Date.now() + expiresInMinutes * 60 * 1000,
       });
       return signedUrl;
     } catch (error) {
       console.error('Error generating signed URL:', error);
       throw error;
     }
   }

  async uploadFiles(
    files?: (UploadedMulterFileI | string)[],
    path = 'main',
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      return [];
    }

    const uploadPromises = files.map((file) => this.uploadFile(file, path));
    return Promise.all(uploadPromises);
  }
}
