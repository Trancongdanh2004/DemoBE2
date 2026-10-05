import { PrismaClient } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const sampleNames = [
  'Nguyễn Văn An', 'Trần Thị Bích', 'Lê Hoàng Cường', 'Phạm Minh Đức', 'Vũ Thị Hạnh',
  'Đặng Văn Hải', 'Bùi Ngọc Linh', 'Đỗ Quang Khải', 'Hồ Thị Mai', 'Ngô Quốc Nam',
  'Dương Thu Phương', 'Lý Văn Quân', 'Phan Thanh Sơn', 'Võ Hồng Thắm', 'Trịnh Quốc Tuấn',
  'Đinh Văn Việt', 'Lương Thị Yến', 'Cao Minh Trí', 'Mai Thị Kim', 'Tô Hoàng Long',
  'Nguyễn Thị Hồng', 'Trần Đình Trọng', 'Lê Thị Thu Thảo', 'Phạm Quốc Hùng', 'Hoàng Minh Tuấn',
  'Đào Bích Ngọc', 'Vũ Hải Đăng', 'Nguyễn Tiến Dũng', 'Lê Khánh Huyền', 'Trần Đức Anh'
];

const majors = [
  'Công nghệ thông tin', 'Khoa học máy tính', 'Kỹ thuật phần mềm', 'Hệ thống thông tin',
  'Kỹ thuật máy tính', 'Toán tin ứng dụng', 'An toàn thông tin', 'Trí tuệ nhân tạo'
];

async function seed() {
  console.log('🌱 Seeding 30 sample applications using Prisma...');
  try {
    for (let i = 0; i < sampleNames.length; i++) {
      const name = sampleNames[i];
      const cccd = `001200${(100000 + i).toString().padStart(6, '0')}`;
      const cccdDate = new Date('2021-05-15');
      const bMajor = majors[i % majors.length];
      const bDate = new Date('2019-06-25');
      const bSerial = `DH-${2019000 + i}`;
      const mMajor = majors[(i + 1) % majors.length];
      const mDate = new Date('2022-11-20');
      const mSerial = `THS-${2022000 + i}`;

      const avatarUrl = `https://images.unsplash.com/photo-${1534528741775 + i * 1000}?w=400&auto=format&fit=crop&q=80`;
      const avatarPid = `recruitment/avatars/sample_avatar_${i}`;
      const bUrl = 'https://res.cloudinary.com/demo/image/upload/v1680000000/sample_degree.pdf';
      const bPid = `recruitment/degrees/sample_bachelor_${i}`;
      const mUrl = 'https://res.cloudinary.com/demo/image/upload/v1680000000/sample_master.pdf';
      const mPid = `recruitment/degrees/sample_master_${i}`;
      const sUrl = 'https://res.cloudinary.com/demo/image/upload/v1680000000/sample_summary.pdf';
      const sPid = `recruitment/summaries/sample_summary_${i}`;

      const createdAt = new Date(Date.now() - i * 3600 * 1000 * 6);

      await prisma.application.upsert({
        where: { cccd },
        update: {},
        create: {
          fullName: name,
          cccd,
          cccdIssueDate: cccdDate,
          avatarUrl,
          avatarPublicId: avatarPid,
          bachelorMajor: bMajor,
          bachelorIssueDate: bDate,
          bachelorSerialNumber: bSerial,
          bachelorFileUrl: bUrl,
          bachelorFilePublicId: bPid,
          masterMajor: mMajor,
          masterIssueDate: mDate,
          masterSerialNumber: mSerial,
          masterFileUrl: mUrl,
          masterFilePublicId: mPid,
          summaryPdfUrl: sUrl,
          summaryPdfPublicId: sPid,
          createdAt,
        },
      });
    }

    console.log('✅ Seeding completed with 30 candidate records in PostgreSQL!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
