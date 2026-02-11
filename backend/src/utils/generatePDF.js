const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate student report card
 */
const generateReportCard = async (studentData, marksData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `report_${studentData.registrationNumber}_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../../uploads/reports', fileName);

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc
        .fontSize(20)
        .text('College ERP System', { align: 'center' })
        .fontSize(16)
        .text('Student Report Card', { align: 'center' })
        .moveDown();

      // Student Details
      doc
        .fontSize(12)
        .text(`Name: ${studentData.name}`, { continued: true })
        .text(`Roll No: ${studentData.registrationNumber}`, { align: 'right' })
        .text(`Department: ${studentData.department}`, { continued: true })
        .text(`Semester: ${studentData.semester}`, { align: 'right' })
        .moveDown();

      // Marks Table
      doc.fontSize(14).text('Academic Performance', { underline: true }).moveDown();

      const tableTop = doc.y;
      const itemCodeX = 50;
      const descriptionX = 150;
      const quantityX = 300;
      const priceX = 370;
      const amountX = 440;

      doc
        .fontSize(10)
        .text('Subject', itemCodeX, tableTop)
        .text('Max Marks', quantityX, tableTop)
        .text('Obtained', priceX, tableTop)
        .text('Percentage', amountX, tableTop);

      let y = tableTop + 25;

      marksData.forEach((mark) => {
        doc
          .text(mark.subject, itemCodeX, y)
          .text(mark.totalMarks, quantityX, y)
          .text(mark.obtainedMarks, priceX, y)
          .text(`${mark.percentage}%`, amountX, y);
        y += 25;
      });

      // Total
      doc
        .moveDown()
        .fontSize(12)
        .text(`Total Percentage: ${studentData.totalPercentage}%`, { align: 'right' })
        .text(`Result: ${studentData.result}`, { align: 'right' });

      doc.end();

      stream.on('finish', () => {
        resolve(filePath);
      });

      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate fee receipt
 */
const generateFeeReceipt = async (receiptData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `receipt_${receiptData.transactionId}_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../../uploads/receipts', fileName);

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc
        .fontSize(20)
        .text('College ERP System', { align: 'center' })
        .fontSize(16)
        .text('Fee Payment Receipt', { align: 'center' })
        .moveDown(2);

      // Receipt Details
      doc
        .fontSize(12)
        .text(`Receipt No: ${receiptData.receiptNumber}`)
        .text(`Transaction ID: ${receiptData.transactionId}`)
        .text(`Date: ${new Date(receiptData.date).toLocaleDateString()}`)
        .moveDown();

      // Student Details
      doc
        .text(`Student Name: ${receiptData.studentName}`)
        .text(`Roll No: ${receiptData.registrationNumber}`)
        .text(`Department: ${receiptData.department}`)
        .moveDown(2);

      // Payment Details
      doc
        .fontSize(14)
        .text('Payment Details', { underline: true })
        .moveDown()
        .fontSize(12)
        .text(`Fee Type: ${receiptData.feeType}`)
        .text(`Amount Paid: ₹${receiptData.amount}`)
        .text(`Payment Mode: ${receiptData.paymentMode}`)
        .text(`Status: ${receiptData.status}`)
        .moveDown(2);

      // Footer
      doc
        .fontSize(10)
        .text('This is a computer-generated receipt and does not require a signature.', {
          align: 'center',
          italic: true,
        });

      doc.end();

      stream.on('finish', () => {
        resolve(filePath);
      });

      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateReportCard,
  generateFeeReceipt,
};
