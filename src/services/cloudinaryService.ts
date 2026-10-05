import { cloudinary } from '../config/cloudinary';
import { Readable } from 'stream';

export interface UploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
}

/**
 * Tải một buffer lên Cloudinary bằng upload_stream
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
 * Xóa một tài nguyên (asset) khỏi Cloudinary
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    // Thử xóa dưới dạng image trước (phần lớn PDF tải lên dạng auto được lưu là image)
    const res = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    if (res.result !== 'ok') {
      // Thử xóa dưới dạng raw nếu không tìm thấy dạng image
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    }
  } catch (err) {
    console.error(`Failed to delete Cloudinary asset ${publicId}:`, err);
  }
};
