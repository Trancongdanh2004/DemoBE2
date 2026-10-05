import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';

export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('API Error:', err);

  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({
      message: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
      errors: formattedErrors,
    });
    return;
  }

  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        message: 'Dung lượng tệp vượt quá giới hạn tối đa cho phép (5 MB).',
      });
      return;
    }
    res.status(400).json({
      message: `Lỗi xử lý tệp: ${err.message}`,
    });
    return;
  }

  // Handle generic error
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.';

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};
