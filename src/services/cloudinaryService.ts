import { cloudinary } from '../config/cloudinary';
import { Readable } from 'stream';

export interface UploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
}

/**
 * Uploads a buffer to Cloudinary using upload_stream
 */
export const uploadToCloudinary = (
  buffer: Buffer,
  folder: string,
  publicId?: string
): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Upload to Cloudinary failed without result'));
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
        });
      }
    );

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    stream.pipe(uploadStream);
  });
};

/**
 * Deletes an asset from Cloudinary
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    // Try destroying as image first (most PDFs via auto are image)
    const res = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    if (res.result !== 'ok') {
      // Try raw if image was not found
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    }
  } catch (err) {
    console.error(`Failed to delete Cloudinary asset ${publicId}:`, err);
  }
};
