const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../utils/logger');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: false,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  });
};

/**
 * Send email
 */
const sendEmail = async ({ to, subject, html, text, attachments = [] }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `${config.FROM_NAME} <${config.FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    
    logger.info(`Email sent successfully to ${to}`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    logger.error(`Email sending failed: ${error.message}`);
    throw error;
  }
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (user, tempPassword) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Welcome to College ERP System!</h2>
      <p>Hello ${user.name},</p>
      <p>Your account has been created successfully. Here are your login credentials:</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        <p><strong>Role:</strong> ${user.role}</p>
      </div>
      <p>Please login and change your password immediately for security reasons.</p>
      <a href="${config.CORS_ORIGIN}/login" style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
        Login Now
      </a>
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        If you didn't expect this email, please contact the administrator.
      </p>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject: 'Welcome to College ERP System',
    html,
  });
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (user, resetUrl) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Password Reset Request</h2>
      <p>Hello ${user.name},</p>
      <p>We received a request to reset your password. Click the button below to reset it:</p>
      <a href="${resetUrl}" style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
        Reset Password
      </a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request a password reset, please ignore this email.</p>
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        ${resetUrl}
      </p>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject: 'Password Reset Request',
    html,
  });
};

/**
 * Send OTP email
 */
const sendOTPEmail = async (user, otp) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Verification Code</h2>
      <p>Hello ${user.name},</p>
      <p>Your verification code is:</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <h1 style="color: #6366f1; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject: 'Your Verification Code',
    html,
  });
};

/**
 * Send fee reminder email
 */
const sendFeeReminderEmail = async (student, feeDetails) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ef4444;">Fee Payment Reminder</h2>
      <p>Dear ${student.name},</p>
      <p>This is a reminder that your fee payment is due soon.</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Academic Year:</strong> ${feeDetails.academicYear}</p>
        <p><strong>Semester:</strong> ${feeDetails.semester}</p>
        <p><strong>Total Amount:</strong> ₹${feeDetails.totalAmount}</p>
        <p><strong>Paid Amount:</strong> ₹${feeDetails.paidAmount}</p>
        <p><strong>Due Amount:</strong> ₹${feeDetails.dueAmount}</p>
        <p><strong>Due Date:</strong> ${new Date(feeDetails.dueDate).toLocaleDateString()}</p>
      </div>
      <p>Please make the payment before the due date to avoid late fees.</p>
      <a href="${config.CORS_ORIGIN}/fees" style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
        Pay Now
      </a>
    </div>
  `;

  return await sendEmail({
    to: student.email,
    subject: 'Fee Payment Reminder',
    html,
  });
};

/**
 * Send exam notification email
 */
const sendExamNotificationEmail = async (student, examDetails) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Upcoming Exam Notification</h2>
      <p>Dear ${student.name},</p>
      <p>This is to inform you about the upcoming exam:</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Subject:</strong> ${examDetails.subject}</p>
        <p><strong>Exam Type:</strong> ${examDetails.type}</p>
        <p><strong>Date:</strong> ${new Date(examDetails.date).toLocaleDateString()}</p>
        <p><strong>Time:</strong> ${examDetails.startTime} - ${examDetails.endTime}</p>
        <p><strong>Venue:</strong> ${examDetails.venue || 'To be announced'}</p>
        <p><strong>Total Marks:</strong> ${examDetails.totalMarks}</p>
      </div>
      <p>Please be present at the venue 15 minutes before the exam starts.</p>
      <p>Good luck!</p>
    </div>
  `;

  return await sendEmail({
    to: student.email,
    subject: `Exam Notification: ${examDetails.subject}`,
    html,
  });
};

/**
 * Send marks published notification
 */
const sendMarksPublishedEmail = async (student, marksDetails) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">Marks Published</h2>
      <p>Dear ${student.name},</p>
      <p>Your marks for ${marksDetails.subject} have been published.</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Subject:</strong> ${marksDetails.subject}</p>
        <p><strong>Exam:</strong> ${marksDetails.exam}</p>
        <p><strong>Marks Obtained:</strong> ${marksDetails.marksObtained}/${marksDetails.totalMarks}</p>
        <p><strong>Percentage:</strong> ${marksDetails.percentage}%</p>
        <p><strong>Grade:</strong> ${marksDetails.grade}</p>
      </div>
      <a href="${config.CORS_ORIGIN}/marks" style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
        View Details
      </a>
    </div>
  `;

  return await sendEmail({
    to: student.email,
    subject: 'Marks Published',
    html,
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOTPEmail,
  sendFeeReminderEmail,
  sendExamNotificationEmail,
  sendMarksPublishedEmail,
};
