import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { deleteFromCloudinary } from '../services/cloudinaryService';
import { streamExcelApplications } from '../services/excelService';

export const adminLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ message: 'Vui lòng cung cấp tên đăng nhập và mật khẩu.' });
      return;
    }

    if (username !== env.ADMIN_USERNAME) {
      res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
    if (!isMatch) {
      res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
      return;
    }

    const token = jwt.sign({ username: env.ADMIN_USERNAME }, env.JWT_SECRET, {
      expiresIn: '8h',
    });

    res.json({
      message: 'Đăng nhập thành công!',
      token,
      admin: { username: env.ADMIN_USERNAME },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminMe = (req: Request, res: Response): void => {
  res.json({
    admin: req.admin,
  });
};

export const getApplications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 10));
    const search = ((req.query.search as string) || '').trim();
    const offset = (page - 1) * pageSize;

    const whereClause: any = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { cccd: { contains: search } },
          ],
        }
      : {};

    // Count total records and fetch paginated items
    const [total, applications] = await Promise.all([
      prisma.application.count({ where: whereClause }),
      prisma.application.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    res.json({
      data: applications,
      page,
      pageSize,
      total,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

export const getApplicationById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const application = await prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      res.status(404).json({ message: 'Không tìm thấy hồ sơ ứng tuyển.' });
      return;
    }

    res.json(application);
  } catch (error) {
    next(error);
  }
};

export const deleteApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        avatarPublicId: true,
        bachelorFilePublicId: true,
        masterFilePublicId: true,
        summaryPdfPublicId: true,
      },
    });

    if (!application) {
      res.status(404).json({ message: 'Không tìm thấy hồ sơ cần xóa.' });
      return;
    }

    // Delete record from DB using Prisma
    await prisma.application.delete({
      where: { id },
    });

    // Clean up files in Cloudinary in background
    const deleteTasks: Promise<void>[] = [
      deleteFromCloudinary(application.bachelorFilePublicId),
      deleteFromCloudinary(application.masterFilePublicId),
      deleteFromCloudinary(application.summaryPdfPublicId),
    ];

    if (application.avatarPublicId) {
      deleteTasks.push(deleteFromCloudinary(application.avatarPublicId));
    }

    Promise.allSettled(deleteTasks).catch((err) =>
      console.error('Cloudinary deletion error:', err)
    );

    res.json({ message: 'Đã xóa hồ sơ ứng tuyển và các tệp đính kèm thành công.' });
  } catch (error) {
    next(error);
  }
};

export const exportApplicationsExcel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const search = ((req.query.search as string) || '').trim();

    const whereClause: any = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { cccd: { contains: search } },
          ],
        }
      : {};

    const applications = await prisma.application.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const filename = `HoSoUngTuyen-${dateStr}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await streamExcelApplications(applications, res);
    res.end();
  } catch (error) {
    next(error);
  }
};
