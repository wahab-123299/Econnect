import multer from 'multer';
import { NextFunction, Request, Response } from 'express';
import { AppError } from './error-handler';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB, per Phase 5 spec
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB — a short walkthrough clip, not a feature film
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);

// Memory storage throughout: files are capped and short-lived — streamed
// straight to Cloudinary, never touching local disk.
function buildUploadMiddleware(
  fieldName: string,
  maxSizeBytes: number,
  allowedMimeTypes: Set<string>,
  invalidTypeMessage: string,
  tooLargeMessage: string,
) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeBytes },
    fileFilter: (_req, file, cb) => {
      if (!allowedMimeTypes.has(file.mimetype)) {
        cb(new AppError(422, 'INVALID_FILE_TYPE', invalidTypeMessage));
        return;
      }
      cb(null, true);
    },
  }).single(fieldName);

  // Wraps multer so its own error type (file too large, etc.) is translated
  // into our standard { error: { code, message } } shape instead of leaking
  // Multer's internal error format to the client.
  return function handleUpload(req: Request, res: Response, next: NextFunction): void {
    upload(req, res, (err: unknown) => {
      if (!err) {
        next();
        return;
      }
      if (err instanceof AppError) {
        next(err);
        return;
      }
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        next(new AppError(422, 'FILE_TOO_LARGE', tooLargeMessage));
        return;
      }
      next(err);
    });
  };
}

export const uploadSingleImage = buildUploadMiddleware(
  'flyer',
  MAX_IMAGE_SIZE_BYTES,
  ALLOWED_IMAGE_MIME_TYPES,
  'Only JPEG, PNG, or WEBP images are allowed.',
  'Image must be 5MB or smaller.',
);

export const uploadVenuePhoto = buildUploadMiddleware(
  'photo',
  MAX_IMAGE_SIZE_BYTES,
  ALLOWED_IMAGE_MIME_TYPES,
  'Only JPEG, PNG, or WEBP images are allowed.',
  'Image must be 5MB or smaller.',
);

export const uploadVenueVideo = buildUploadMiddleware(
  'video',
  MAX_VIDEO_SIZE_BYTES,
  ALLOWED_VIDEO_MIME_TYPES,
  'Only MP4, MOV, or WEBM videos are allowed.',
  'Video must be 50MB or smaller.',
);
