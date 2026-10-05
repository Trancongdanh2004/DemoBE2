import multer from 'multer';
import { Request } from 'express';

const storage = multer.memoryStorage();

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = file.originalname.toLowerCase();

    if (file.fieldname === 'avatarFile') {
      const isImageMime = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(
        file.mimetype
      );
      const isImageExt = ['.jpg', '.jpeg', '.png', '.webp'].some((e) => ext.endsWith(e));

      if (isImageMime && isImageExt) {
        cb(null, true);
      } else {
        cb(
          new Error(
            `Ảnh chân dung "${file.originalname}" không đúng định dạng. Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.`
          )
        );
      }
      return;
    }

    // Default for bachelorFile and masterFile: PDF only
    const isMimePdf = file.mimetype === 'application/pdf';
    const isExtPdf = ext.endsWith('.pdf');

    if (isMimePdf && isExtPdf) {
      cb(null, true);
    } else {
      cb(new Error(`Tệp "${file.originalname}" không đúng định dạng. Chỉ chấp nhận tệp PDF (.pdf).`));
    }
  },
});

/**
 * Validates that a buffer starts with the PDF magic bytes '%PDF-'
 */
export const isValidPdfBuffer = (buffer: Buffer): boolean => {
  if (!buffer || buffer.length < 5) return false;
  // Magic bytes: %PDF- -> 0x25, 0x50, 0x44, 0x46, 0x2D
  return (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  );
};

/**
 * Validates that a buffer is a valid image (JPEG, PNG, or WebP)
 */
export const isValidImageBuffer = (buffer: Buffer): boolean => {
  if (!buffer || buffer.length < 8) return false;
  // JPEG: FF D8 FF
  const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  // WebP: RIFF....WEBP
  const isWebp =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  return isJpg || isPng || isWebp;
};
