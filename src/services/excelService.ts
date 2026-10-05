import ExcelJS from 'exceljs';
import { Response } from 'express';

export interface ExcelApplicationData {
  id: string;
  fullName: string;
  cccd: string;
  cccdIssueDate: string | Date;
  avatarUrl?: string | null;
  bachelorMajor: string;
  bachelorIssueDate: string | Date;
  bachelorSerialNumber: string;
  bachelorFileUrl: string;
  masterMajor: string;
  masterIssueDate: string | Date;
  masterSerialNumber: string;
  masterFileUrl: string;
  summaryPdfUrl: string;
  createdAt: string | Date;
}

const formatDate = (dateVal: string | Date): string => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateTime = (dateVal: string | Date): string => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

export const streamExcelApplications = async (
  rows: ExcelApplicationData[],
  res: Response
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Danh sách ứng viên');

  // Định nghĩa các cột
  worksheet.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Ảnh chân dung', key: 'avatarUrl', width: 18 },
    { header: 'Họ và tên', key: 'fullName', width: 25 },
    { header: 'Số CCCD', key: 'cccd', width: 18 },
    { header: 'Ngày cấp CCCD', key: 'cccdIssueDate', width: 16 },
    { header: 'Chuyên ngành ĐH', key: 'bachelorMajor', width: 25 },
    { header: 'Ngày cấp ĐH', key: 'bachelorIssueDate', width: 16 },
    { header: 'Số hiệu bằng ĐH', key: 'bachelorSerialNumber', width: 20 },
    { header: 'Tệp bằng ĐH', key: 'bachelorFileUrl', width: 24 },
    { header: 'Chuyên ngành ThS', key: 'masterMajor', width: 25 },
    { header: 'Ngày cấp ThS', key: 'masterIssueDate', width: 16 },
    { header: 'Số hiệu bằng ThS', key: 'masterSerialNumber', width: 20 },
    { header: 'Tệp bằng ThS', key: 'masterFileUrl', width: 24 },
    { header: 'PDF Tóm tắt', key: 'summaryPdfUrl', width: 24 },
    { header: 'Ngày nộp hồ sơ', key: 'createdAt', width: 20 },
  ];

  // Định dạng tiêu đề: In đậm, nền xanh navy, chữ trắng, căn giữa
  const headerRow = worksheet.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }, // Màu xanh Slate/Navy
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  // Điền dữ liệu các hàng
  rows.forEach((item, index) => {
    const row = worksheet.addRow({
      stt: index + 1,
      fullName: item.fullName,
      cccd: item.cccd,
      cccdIssueDate: formatDate(item.cccdIssueDate),
      bachelorMajor: item.bachelorMajor,
      bachelorIssueDate: formatDate(item.bachelorIssueDate),
      bachelorSerialNumber: item.bachelorSerialNumber,
      masterMajor: item.masterMajor,
      masterIssueDate: formatDate(item.masterIssueDate),
      masterSerialNumber: item.masterSerialNumber,
      createdAt: formatDateTime(item.createdAt),
    });

    row.height = 24;

    // Căn giữa cho các cột cụ thể
    row.getCell('stt').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('cccd').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('cccdIssueDate').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('bachelorIssueDate').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('masterIssueDate').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('createdAt').alignment = { vertical: 'middle', horizontal: 'center' };

    // Liên kết ảnh chân dung
    const avatarCell = row.getCell('avatarUrl');
    if (item.avatarUrl) {
      avatarCell.value = {
        text: 'Xem ảnh',
        hyperlink: item.avatarUrl,
      };
      avatarCell.font = { color: { argb: 'FF2563EB' }, underline: true };
    } else {
      avatarCell.value = 'Chưa có';
      avatarCell.font = { color: { argb: 'FF94A3B8' } };
    }
    avatarCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Siêu liên kết có thể nhấp cho các cột tệp PDF
    const bachelorCell = row.getCell('bachelorFileUrl');
    bachelorCell.value = {
      text: 'Xem bằng ĐH (PDF)',
      hyperlink: item.bachelorFileUrl,
    };
    bachelorCell.font = { color: { argb: 'FF2563EB' }, underline: true };
    bachelorCell.alignment = { vertical: 'middle', horizontal: 'center' };

    const masterCell = row.getCell('masterFileUrl');
    masterCell.value = {
      text: 'Xem bằng ThS (PDF)',
      hyperlink: item.masterFileUrl,
    };
    masterCell.font = { color: { argb: 'FF2563EB' }, underline: true };
    masterCell.alignment = { vertical: 'middle', horizontal: 'center' };

    const summaryCell = row.getCell('summaryPdfUrl');
    summaryCell.value = {
      text: 'Xem PDF Tóm tắt',
      hyperlink: item.summaryPdfUrl,
    };
    summaryCell.font = { color: { argb: 'FF2563EB' }, underline: true };
    summaryCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Hiệu ứng màu xen kẽ nhẹ giữa các dòng (zebra striping)
    if (index % 2 === 1) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      });
    }

    // Kẻ viền cho tất cả các ô dữ liệu
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  // Xuất luồng dữ liệu (stream) ra phản hồi HTTP
  await workbook.xlsx.write(res);
};
