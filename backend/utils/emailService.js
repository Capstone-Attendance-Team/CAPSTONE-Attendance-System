const nodemailer = require('nodemailer');

/**
 * Email Service for Attendance Notifications
 * Sends email notifications to parents about student attendance
 */

// Initialize email transporter with Gmail or custom SMTP
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,      // Your email address
    pass: process.env.EMAIL_PASSWORD,   // Your email password or app password
  },
});

/**
 * Send ABSENT notification to parent
 * @param {string} parentEmail - Parent's email address
 * @param {object} attendanceData - Attendance record with student info
 * @returns {Promise}
 */
async function sendAbsentNotification(parentEmail, attendanceData) {
  if (!parentEmail || !process.env.EMAIL_USER) {
    console.warn('Email service not configured. Skipping email notification.');
    return null;
  }

  const { name, studentId, section, date, arrivalTime } = attendanceData;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: parentEmail,
    subject: `⚠️ Attendance Alert: ${name} Marked ABSENT`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #d32f2f;">Attendance Alert</h2>
        
        <p>Dear Parent/Guardian,</p>
        
        <p>Your child has been marked <strong style="color: #d32f2f;">ABSENT</strong> from school today.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #d32f2f; margin: 20px 0;">
          <p><strong>Student Name:</strong> ${name}</p>
          <p><strong>Student ID:</strong> ${studentId}</p>
          <p><strong>Section:</strong> ${section}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time Recorded:</strong> ${arrivalTime || 'N/A'} (After 8:31 AM threshold)</p>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          <strong>Attendance Status Guidelines:</strong><br>
          • 7:00 AM - 7:30 AM: Present<br>
          • 7:31 AM - 8:30 AM: Late<br>
          • After 8:31 AM: Absent
        </p>
        
        <p>If you believe this is an error, please contact the school administration immediately.</p>
        
        <p style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; color: #999; font-size: 12px;">
          This is an automated notification from the Attendance Management System.<br>
          Please do not reply to this email.
        </p>
      </div>
    `,
    text: `
Attendance Alert

Dear Parent/Guardian,

Your child has been marked ABSENT from school today.

Student Name: ${name}
Student ID: ${studentId}
Section: ${section}
Date: ${date}
Time Recorded: ${arrivalTime || 'N/A'} (After 8:31 AM threshold)

Attendance Status Guidelines:
• 7:00 AM - 7:30 AM: Present
• 7:31 AM - 8:30 AM: Late
• After 8:31 AM: Absent

If you believe this is an error, please contact the school administration immediately.

This is an automated notification from the Attendance Management System.
    `,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent to:', parentEmail);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send LATE notification to parent (Optional)
 * @param {string} parentEmail - Parent's email address
 * @param {object} attendanceData - Attendance record
 * @returns {Promise}
 */
async function sendLateNotification(parentEmail, attendanceData) {
  if (!parentEmail || !process.env.EMAIL_USER) {
    console.warn('Email service not configured. Skipping email notification.');
    return null;
  }

  const { name, studentId, section, date, arrivalTime } = attendanceData;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: parentEmail,
    subject: `📌 Attendance Notice: ${name} Marked LATE`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #f57c00;">Attendance Notice</h2>
        
        <p>Dear Parent/Guardian,</p>
        
        <p>Your child has been marked <strong style="color: #f57c00;">LATE</strong> for today's classes.</p>
        
        <div style="background-color: #fff3e0; padding: 15px; border-left: 4px solid #f57c00; margin: 20px 0;">
          <p><strong>Student Name:</strong> ${name}</p>
          <p><strong>Student ID:</strong> ${studentId}</p>
          <p><strong>Section:</strong> ${section}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Arrival Time:</strong> ${arrivalTime || 'N/A'} (7:31 AM - 8:30 AM window)</p>
        </div>
        
        <p>This is a courtesy notice. Please encourage your child to arrive on time.</p>
        
        <p style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; color: #999; font-size: 12px;">
          This is an automated notification from the Attendance Management System.
        </p>
      </div>
    `,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Late notification sent to:', parentEmail);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending late notification:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendAbsentNotification,
  sendLateNotification,
};
