import { describe, it, expect, vi } from 'vitest';

const mockUploadStream = vi.fn();
vi.mock('../config/cloudinary', () => ({
  cloudinary: {
    uploader: {
      upload_stream: (
        _opts: unknown,
        cb: (error: unknown, result: unknown) => void,
      ) => mockUploadStream(cb),
    },
  },
}));

import { uploadService } from './upload.service';

describe('uploadService.uploadImageBuffer', () => {
  it('resolves with the secure URL on success', async () => {
    mockUploadStream.mockImplementation((cb) => {
      cb(null, { secure_url: 'https://res.cloudinary.com/demo/image/upload/flyer.jpg' });
      return { end: vi.fn() };
    });

    const result = await uploadService.uploadImageBuffer(Buffer.from('fake'), 'econnect/flyers');
    expect(result.url).toBe('https://res.cloudinary.com/demo/image/upload/flyer.jpg');
  });

  it('rejects with a friendly AppError when Cloudinary errors', async () => {
    mockUploadStream.mockImplementation((cb) => {
      cb(new Error('cloudinary down'), null);
      return { end: vi.fn() };
    });

    await expect(
      uploadService.uploadImageBuffer(Buffer.from('fake'), 'econnect/flyers'),
    ).rejects.toMatchObject({ code: 'UPLOAD_FAILED' });
  });
});
