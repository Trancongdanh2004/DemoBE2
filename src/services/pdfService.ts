import { PDFDocument, rgb, PDFName, PDFString, PDFArray, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';

export interface SummaryPdfData {
  id: string;
  fullName: string;
  cccd: string;
  cccdIssueDate: string;
  avatarBuffer?: Buffer;
  avatarMimeType?: string;
  avatarUrl?: string;
  bachelorMajor: string;
  bachelorIssueDate: string;
  bachelorSerialNumber: string;
  bachelorFileUrl: string;
  masterMajor: string;
  masterIssueDate: string;
  masterSerialNumber: string;
  masterFileUrl: string;
  submittedAt: string;
}

/**
 * Thêm chú thích liên kết URL có thể nhấp vào trang pdf-lib
 */
const addLinkAnnotation = (
  pdfDoc: PDFDocument,
  page: PDFPage,
  url: string,
  rect: [number, number, number, number]
) => {
  const context = pdfDoc.context;
  const linkDict = context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: rect,
    Border: [0, 0, 0],
    A: {
      Type: 'Action',
      S: 'URI',
      URI: PDFString.of(url),
    },
  });
  const linkRef = context.register(linkDict);
  let annots = page.node.lookup(PDFName.of('Annots'));
  if (!annots || !(annots instanceof PDFArray)) {
    annots = context.obj([]);
    page.node.set(PDFName.of('Annots'), annots);
  }
  (annots as PDFArray).push(linkRef);
};

export const generateSummaryPdf = async (data: SummaryPdfData): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Tải font chữ hỗ trợ tiếng Việt
  const fontDir = path.resolve(__dirname, '../../assets/fonts');
  const regularFontPath = path.join(fontDir, 'Roboto-Regular.ttf');
  const boldFontPath = path.join(fontDir, 'Roboto-Bold.ttf');

  const regularFontBytes = fs.readFileSync(regularFontPath);
  const boldFontBytes = fs.readFileSync(boldFontPath);

  const fontRegular = await pdfDoc.embedFont(regularFontBytes);
  const fontBold = await pdfDoc.embedFont(boldFontBytes);

  // Kích thước chuẩn khổ A4: 595.28 x 841.89 điểm (points)
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const primaryColor = rgb(0.08, 0.25, 0.45); // Xanh navy đậm
  const secondaryColor = rgb(0.2, 0.2, 0.2); // Xám đen slate
  const lightBgColor = rgb(0.94, 0.96, 0.98); // Nền xám xanh nhạt
  const linkColor = rgb(0.1, 0.4, 0.85); // Xanh dương cho liên kết
  const borderColor = rgb(0.85, 0.88, 0.92);

  const margin = 50;
  const contentWidth = width - margin * 2;
  let currentY = height - 55;

  // Tiêu đề đầu trang
  const titleText = 'HỒ SƠ ỨNG TUYỂN';
  const titleWidth = fontBold.widthOfTextAtSize(titleText, 20);
  page.drawText(titleText, {
    x: (width - titleWidth) / 2,
    y: currentY,
    size: 20,
    font: fontBold,
    color: primaryColor,
  });

  currentY -= 20;
  const subText = `Thời gian nộp: ${data.submittedAt}  |  Mã hồ sơ: ${data.id.slice(0, 8)}`;
  const subWidth = fontRegular.widthOfTextAtSize(subText, 10);
  page.drawText(subText, {
    x: (width - subWidth) / 2,
    y: currentY,
    size: 10,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.5),
  });

  currentY -= 15;
  // Đường kẻ phân cách tiêu đề
  page.drawLine({
    start: { x: margin, y: currentY },
    end: { x: width - margin, y: currentY },
    thickness: 1.5,
    color: primaryColor,
  });

  currentY -= 30;

  // Hàm hỗ trợ vẽ tiêu đề từng phần
  const drawSectionHeader = (title: string) => {
    // Thanh nền
    page.drawRectangle({
      x: margin,
      y: currentY - 5,
      width: contentWidth,
      height: 24,
      color: lightBgColor,
      borderColor: borderColor,
      borderWidth: 1,
    });

    page.drawText(title.toUpperCase(), {
      x: margin + 12,
      y: currentY + 2,
      size: 11,
      font: fontBold,
      color: primaryColor,
    });

    currentY -= 30;
  };

  // Hàm hỗ trợ vẽ dòng nhãn - giá trị
  const drawRow = (label: string, value: string) => {
    const labelX = margin + 15;
    const valueX = margin + 180;

    page.drawText(label, {
      x: labelX,
      y: currentY,
      size: 10.5,
      font: fontBold,
      color: secondaryColor,
    });

    page.drawText(value || '-', {
      x: valueX,
      y: currentY,
      size: 10.5,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });

    currentY -= 22;
  };

  // Hàm hỗ trợ vẽ dòng liên kết
  const drawLinkRow = (label: string, linkText: string, url: string) => {
    const labelX = margin + 15;
    const valueX = margin + 180;

    page.drawText(label, {
      x: labelX,
      y: currentY,
      size: 10.5,
      font: fontBold,
      color: secondaryColor,
    });

    const displayLinkText = `🔗 ${linkText} (Nhấp để mở xem)`;
    const textWidth = fontRegular.widthOfTextAtSize(displayLinkText, 10.5);

    page.drawText(displayLinkText, {
      x: valueX,
      y: currentY,
      size: 10.5,
      font: fontRegular,
      color: linkColor,
    });

    // Gạch chân liên kết
    page.drawLine({
      start: { x: valueX, y: currentY - 2 },
      end: { x: valueX + textWidth, y: currentY - 2 },
      thickness: 0.8,
      color: linkColor,
    });

    // Hộp chú thích liên kết có thể nhấp
    const annotRect: [number, number, number, number] = [
      valueX,
      currentY - 3,
      valueX + textWidth,
      currentY + 12,
    ];
    addLinkAnnotation(pdfDoc, page, url, annotRect);

    currentY -= 24;
  };

  // Nhúng ảnh chân dung của ứng viên nếu có
  let embeddedAvatarImage: any = null;
  if (data.avatarBuffer) {
    try {
      if (data.avatarMimeType?.includes('png')) {
        embeddedAvatarImage = await pdfDoc.embedPng(data.avatarBuffer);
      } else {
        // Nhúng ảnh JPG
        embeddedAvatarImage = await pdfDoc.embedJpg(data.avatarBuffer);
      }
    } catch (e) {
      // Phương án dự phòng: nếu định dạng không phải JPG/PNG chuẩn, thử thay thế giữa embedJpg và embedPng
      try {
        embeddedAvatarImage = await pdfDoc.embedPng(data.avatarBuffer);
      } catch {}
    }
  }

  // 1. Phần thông tin cá nhân
  drawSectionHeader('1. Thông tin cá nhân');
  const personalStartY = currentY;

  drawRow('Họ và tên:', data.fullName);
  drawRow('Số CCCD:', data.cccd);
  drawRow('Ngày cấp CCCD:', data.cccdIssueDate);
  if (data.avatarUrl) {
    drawLinkRow('Ảnh chân dung:', 'Xem ảnh gốc', data.avatarUrl);
  }

  // Vẽ khung ảnh chân dung ở bên phải nếu có
  if (embeddedAvatarImage) {
    const photoW = 75;
    const photoH = 100;
    const photoX = width - margin - photoW - 10;
    const photoY = personalStartY - photoH + 20;

    page.drawImage(embeddedAvatarImage, {
      x: photoX,
      y: photoY,
      width: photoW,
      height: photoH,
    });

    // Viền khung ảnh
    page.drawRectangle({
      x: photoX,
      y: photoY,
      width: photoW,
      height: photoH,
      borderColor: borderColor,
      borderWidth: 1.5,
    });

    // Chú thích dưới ảnh
    const caption = 'Ảnh chân dung';
    const capWidth = fontRegular.widthOfTextAtSize(caption, 8);
    page.drawText(caption, {
      x: photoX + (photoW - capWidth) / 2,
      y: photoY - 12,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  currentY -= 15;

  // 2. Phần bằng tốt nghiệp đại học
  drawSectionHeader('2. Bằng tốt nghiệp đại học');
  drawRow('Chuyên ngành:', data.bachelorMajor);
  drawRow('Ngày cấp bằng:', data.bachelorIssueDate);
  drawRow('Số hiệu bằng tốt nghiệp:', data.bachelorSerialNumber);
  drawLinkRow('Tệp bằng đính kèm:', 'Tệp PDF Bằng Đại học', data.bachelorFileUrl);

  currentY -= 15;

  // 3. Phần bằng tốt nghiệp thạc sĩ
  drawSectionHeader('3. Bằng tốt nghiệp thạc sĩ');
  drawRow('Chuyên ngành:', data.masterMajor);
  drawRow('Ngày cấp bằng:', data.masterIssueDate);
  drawRow('Số hiệu bằng tốt nghiệp:', data.masterSerialNumber);
  drawLinkRow('Tệp bằng đính kèm:', 'Tệp PDF Bằng Thạc sĩ', data.masterFileUrl);

  // Ghi chú chân trang (footer)
  const footerY = 45;
  page.drawLine({
    start: { x: margin, y: footerY + 20 },
    end: { x: width - margin, y: footerY + 20 },
    thickness: 0.5,
    color: borderColor,
  });

  const footerNotice = 'Hồ sơ tuyển dụng chính thức – Tạo tự động bởi Hệ thống Tiếp nhận Tuyển dụng.';
  const footerNoticeWidth = fontRegular.widthOfTextAtSize(footerNotice, 9);
  page.drawText(footerNotice, {
    x: (width - footerNoticeWidth) / 2,
    y: footerY + 8,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.55, 0.6),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};
