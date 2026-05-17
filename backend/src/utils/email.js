const nodemailer = require('nodemailer');
const logger = require('./logger');

const sendOtpEmail = async (toEmail, otpCode) => {
  try {
    // Determine configuration dynamically from .env
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Standard configuration for Gmail
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"KaamKonnect Identity Server" <${process.env.SMTP_EMAIL}>`,
      to: toEmail,
      subject: 'Your 6-Digit Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #2563EB; text-align: center;">Identity Verification</h2>
          <p style="font-size: 16px; color: #333;">Hello,</p>
          <p style="font-size: 16px; color: #333;">You have requested to reset your password or verify your identity. Please use the following 6-digit orchestration code:</p>
          <div style="background-color: #F1F5F9; padding: 15px; border-radius: 8px; text-align: center; margin: 25px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1E293B;">${otpCode}</span>
          </div>
          <p style="font-size: 14px; color: #64748B;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #94A3B8; text-align: center;">© 2026 KaamKonnect AI Service Orchestrator</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email successfully sent to ${toEmail} [Message ID: ${info.messageId}]`);
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${toEmail}: ${error.message}`);
    throw new Error('Failed to send verification email. Please try again.');
  }
};

module.exports = {
  sendOtpEmail,
};
