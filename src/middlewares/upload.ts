import multer from 'multer';
import { Request } from 'express';

const storage = multer.memoryStorage();

// Dung lượng tệp tối đa: 5MB
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

    // Mặc định cho bachelorFile và masterFile: Chỉ chấp nhận PDF
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
 * Kiểm tra buffer có bắt đầu bằng magic bytes '%PDF-' của tệp PDF hay không
 */
export const isValidPdfBuffer = (buffer: Buffer): boolean => {
  if (!buffer || buffer.length < 5) return false;
  // Chữ ký tệp (magic bytes): %PDF- -> 0x25, 0x50, 0x44, 0x46, 0x2D
  return (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  );
};

/**
 * Kiểm tra buffer có phải là tệp ảnh hợp lệ (JPEG, PNG hoặc WebP) hay không
 */
export const isValidImageBuffer = (buffer: Buffer): boolean => {
  if (!buffer || buffer.length < 8) return false;
  // Định dạng JPEG: FF D8 FF
  const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  // Định dạng PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  // Định dạng WebP: RIFF....WEBP
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
