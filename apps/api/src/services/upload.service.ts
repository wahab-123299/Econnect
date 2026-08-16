import { cloudinary } from '../config/cloudinary';
import { AppError } from '../middleware/error-handler';

export const uploadService = {
  uploadImageBuffer(buffer: Buffer, folder: string): Promise<{ url: string }> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error || !result) {
            reject(new AppError(502, 'UPLOAD_FAILED', 'Image upload failed. Please try again.'));
            return;
          }
          resolve({ url: result.secure_url });
        },
      );
      stream.end(buffer);
    });
  },

  uploadVideoBuffer(buffer: Buffer, folder: string): Promise<{ url: string }> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'video' },
        (error, result) => {
          if (error || !result) {
            reject(new AppError(502, 'UPLOAD_FAILED', 'Video upload failed. Please try again.'));
            return;
          }
          resolve({ url: result.secure_url });
        },
      );
      stream.end(buffer);
    });
  },
};
