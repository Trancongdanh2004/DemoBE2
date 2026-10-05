import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { isValidPdfBuffer, isValidImageBuffer } from '../middlewares/upload';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/cloudinaryService';
import { generateSummaryPdf } from '../services/pdfService';
import { prisma } from '../config/prisma';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// Submission zod schema
export const applicationSchema = z.object({
  fullName: z
    .string({ required_error: 'Họ và tên là bắt buộc.' })
    .trim()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự.')
    .max(255, 'Họ và tên không được vượt quá 255 ký tự.'),
  cccd: z
    .string({ required_error: 'Số CCCD là bắt buộc.' })
    .trim()
    .regex(/^\d{12}$/, 'Số CCCD phải gồm đúng 12 chữ số.'),
  cccdIssueDate: z
    .string({ required_error: 'Ngày cấp CCCD là bắt buộc.' })
    .refine((val) => dateRegex.test(val) && !isNaN(Date.parse(val)), {
      message: 'Ngày cấp CCCD không đúng định dạng YYYY-MM-DD.',
    })
    .refine((val) => new Date(val) <= new Date(), {
      message: 'Ngày cấp CCCD không được trong tương lai.',
    }),
  bachelorMajor: z
    .string({ required_error: 'Chuyên ngành đại học là bắt buộc.' })
    .trim()
    .min(2, 'Chuyên ngành đại học phải có ít nhất 2 ký tự.')
    .max(255, 'Chuyên ngành đại học không được vượt quá 255 ký tự.'),
  bachelorIssueDate: z
    .string({ required_error: 'Ngày cấp bằng đại học là bắt buộc.' })
    .refine((val) => dateRegex.test(val) && !isNaN(Date.parse(val)), {
      message: 'Ngày cấp bằng đại học không đúng định dạng YYYY-MM-DD.',
    })
    .refine((val) => new Date(val) <= new Date(), {
      message: 'Ngày cấp bằng đại học không được trong tương lai.',
    }),
  bachelorSerialNumber: z
    .string({ required_error: 'Số hiệu bằng đại học là bắt buộc.' })
    .trim()
    .min(1, 'Số hiệu bằng đại học là bắt buộc.')
    .max(100, 'Số hiệu bằng đại học không được vượt quá 100 ký tự.'),
  masterMajor: z
    .string({ required_error: 'Chuyên ngành thạc sĩ là bắt buộc.' })
    .trim()
    .min(2, 'Chuyên ngành thạc sĩ phải có ít nhất 2 ký tự.')
    .max(255, 'Chuyên ngành thạc sĩ không được vượt quá 255 ký tự.'),
  masterIssueDate: z
    .string({ required_error: 'Ngày cấp bằng thạc sĩ là bắt buộc.' })
    .refine((val) => dateRegex.test(val) && !isNaN(Date.parse(val)), {
      message: 'Ngày cấp bằng thạc sĩ không đúng định dạng YYYY-MM-DD.',
    })
    .refine((val) => new Date(val) <= new Date(), {
      message: 'Ngày cấp bằng thạc sĩ không được trong tương lai.',
    }),
  masterSerialNumber: z
    .string({ required_error: 'Số hiệu bằng thạc sĩ là bắt buộc.' })
    .trim()
    .min(1, 'Số hiệu bằng thạc sĩ là bắt buộc.')
    .max(100, 'Số hiệu bằng thạc sĩ không được vượt quá 100 ký tự.'),
}).refine(
  (data) => {
    const bDate = new Date(data.bachelorIssueDate);
    const mDate = new Date(data.masterIssueDate);
    return mDate >= bDate;
  },
  {
    message: 'Ngày cấp bằng thạc sĩ không được trước ngày cấp bằng đại học.',
    path: ['masterIssueDate'],
  }
);

export const submitApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Track uploaded assets for rollback
  const uploadedPublicIds: string[] = [];

  try {
    // 1. Validate files presence
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const avatarFile = files?.['avatarFile']?.[0];
    const bachelorFile = files?.['bachelorFile']?.[0];
    const masterFile = files?.['masterFile']?.[0];

    if (!bachelorFile) {
      res.status(400).json({ message: 'Vui lòng tải lên tệp PDF bằng tốt nghiệp đại học.' });
      return;
    }
    if (!masterFile) {
      res.status(400).json({ message: 'Vui lòng tải lên tệp PDF bằng tốt nghiệp thạc sĩ.' });
      return;
    }

    // 2. Validate file signatures (magic bytes)
    if (avatarFile && !isValidImageBuffer(avatarFile.buffer)) {
      res.status(400).json({
        message: 'Ảnh chân dung không phải là tệp ảnh hợp lệ (chỉ hỗ trợ JPG, PNG, WEBP).',
      });
      return;
    }
    if (!isValidPdfBuffer(bachelorFile.buffer)) {
      res.status(400).json({
        message: 'Tệp bằng đại học không phải là tệp PDF hợp lệ (lỗi chữ ký tệp).',
      });
      return;
    }
    if (!isValidPdfBuffer(masterFile.buffer)) {
      res.status(400).json({
        message: 'Tệp bằng thạc sĩ không phải là tệp PDF hợp lệ (lỗi chữ ký tệp).',
      });
      return;
    }

    // 3. Validate form data with Zod
    const validatedData = applicationSchema.parse(req.body);

    // 4. Check duplicate CCCD via Prisma
    const existingApp = await prisma.application.findUnique({
      where: { cccd: validatedData.cccd },
    });

    if (existingApp) {
      res.status(409).json({
        message: `Số CCCD ${validatedData.cccd} đã tồn tại trong hệ thống. Mỗi ứng viên chỉ được nộp hồ sơ một lần.`,
      });
      return;
    }

    // 5. Upload avatar to Cloudinary if provided
    let avatarUrl: string | undefined;
    let avatarPublicId: string | undefined;

    if (avatarFile) {
      const avatarUpload = await uploadToCloudinary(
        avatarFile.buffer,
        'recruitment/avatars'
      );
      avatarUrl = avatarUpload.secure_url;
      avatarPublicId = avatarUpload.public_id;
      uploadedPublicIds.push(avatarUpload.public_id);
    }

    // 6. Upload bachelor degree to Cloudinary
    const bachelorUpload = await uploadToCloudinary(
      bachelorFile.buffer,
      'recruitment/degrees'
    );
    uploadedPublicIds.push(bachelorUpload.public_id);

    // 7. Upload master degree to Cloudinary
    const masterUpload = await uploadToCloudinary(
      masterFile.buffer,
      'recruitment/degrees'
    );
    uploadedPublicIds.push(masterUpload.public_id);

    // 8. Generate Summary PDF (with embedded avatar if available)
    const now = new Date();
    const formattedSubmittedAt = `${String(now.getDate()).padStart(2, '0')}/${String(
      now.getMonth() + 1
    ).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const tempId = Math.random().toString(36).substring(2, 10).toUpperCase();

    const formatDateVN = (dStr: string) => {
      const [y, m, d] = dStr.split('-');
      return `${d}/${m}/${y}`;
    };

    const summaryPdfBuffer = await generateSummaryPdf({
      id: tempId,
      fullName: validatedData.fullName,
      cccd: validatedData.cccd,
      cccdIssueDate: formatDateVN(validatedData.cccdIssueDate),
      avatarBuffer: avatarFile?.buffer,
      avatarMimeType: avatarFile?.mimetype,
      avatarUrl,
      bachelorMajor: validatedData.bachelorMajor,
      bachelorIssueDate: formatDateVN(validatedData.bachelorIssueDate),
      bachelorSerialNumber: validatedData.bachelorSerialNumber,
      bachelorFileUrl: bachelorUpload.secure_url,
      masterMajor: validatedData.masterMajor,
      masterIssueDate: formatDateVN(validatedData.masterIssueDate),
      masterSerialNumber: validatedData.masterSerialNumber,
      masterFileUrl: masterUpload.secure_url,
      submittedAt: formattedSubmittedAt,
    });

    // 9. Upload Summary PDF to Cloudinary
    const summaryUpload = await uploadToCloudinary(
      summaryPdfBuffer,
      'recruitment/summaries'
    );
    uploadedPublicIds.push(summaryUpload.public_id);

    // 10. Insert record into PostgreSQL using Prisma
    const createdRecord = await prisma.application.create({
      data: {
        fullName: validatedData.fullName,
        cccd: validatedData.cccd,
        cccdIssueDate: new Date(validatedData.cccdIssueDate),
        avatarUrl,
        avatarPublicId,
        bachelorMajor: validatedData.bachelorMajor,
        bachelorIssueDate: new Date(validatedData.bachelorIssueDate),
        bachelorSerialNumber: validatedData.bachelorSerialNumber,
        bachelorFileUrl: bachelorUpload.secure_url,
        bachelorFilePublicId: bachelorUpload.public_id,
        masterMajor: validatedData.masterMajor,
        masterIssueDate: new Date(validatedData.masterIssueDate),
        masterSerialNumber: validatedData.masterSerialNumber,
        masterFileUrl: masterUpload.secure_url,
        masterFilePublicId: masterUpload.public_id,
        summaryPdfUrl: summaryUpload.secure_url,
        summaryPdfPublicId: summaryUpload.public_id,
      },
    });

    // Success response
    res.status(201).json({
      message: 'Nộp hồ sơ ứng tuyển thành công!',
      id: createdRecord.id,
      summaryPdfUrl: createdRecord.summaryPdfUrl,
    });
  } catch (error) {
    // Rollback uploaded Cloudinary files if any failure occurred
    if (uploadedPublicIds.length > 0) {
      console.warn('⚠️ Rolling back uploaded Cloudinary assets due to error:', uploadedPublicIds);
      await Promise.allSettled(
        uploadedPublicIds.map((pid) => deleteFromCloudinary(pid))
      );
    }
    next(error);
  }
};
