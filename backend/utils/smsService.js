const twilio = require('twilio');

/**
 * SMS Service for Attendance Notifications
 * Uses Twilio to send SMS notifications to parents
 * SMS is faster and more reliable than email for urgent notifications
 */

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Send ABSENT notification via SMS
 * @param {string} phoneNumber - Parent's phone number (format: +1234567890)
 * @param {object} attendanceData - Attendance record with student info
 * @returns {Promise}
 */
async function sendAbsentSMS(phoneNumber, attendanceData) {
  // Check if SMS is enabled and Twilio is configured
  if (process.env.TWILIO_ENABLED !== 'true' || !client) {
    console.warn('SMS service not enabled or not configured. Skipping SMS notification.');
    return null;
  }

  if (!phoneNumber) {
    console.warn('Parent phone number not found. Skipping SMS notification.');
    return null;
  }

  const { name, studentId, section, date, arrivalTime } = attendanceData;

  const messageBody = `⚠️ ATTENDANCE ALERT: ${name} (ID: ${studentId}) from ${section} was marked ABSENT on ${date}. Arrival time: ${arrivalTime || 'N/A'} (After 8:31 AM). Please contact school if this is an error. - SPCC Attendance System`;

  try {
    const message = await client.messages.create({
      body: messageBody,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    console.log('✅ SMS sent successfully:', message.sid);
    return { success: true, messageSid: message.sid };
  } catch (error) {
    console.error('❌ Error sending SMS:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send LATE notification via SMS (Optional)
 * @param {string} phoneNumber - Parent's phone number
 * @param {object} attendanceData - Attendance record
 * @returns {Promise}
 */
async function sendLateSMS(phoneNumber, attendanceData) {
  if (process.env.TWILIO_ENABLED !== 'true' || !client) {
    console.warn('SMS service not enabled or not configured. Skipping SMS notification.');
    return null;
  }

  if (!phoneNumber) {
    console.warn('Parent phone number not found. Skipping SMS notification.');
    return null;
  }

  const { name, studentId, section, date, arrivalTime } = attendanceData;

  const messageBody = `📌 ATTENDANCE NOTICE: ${name} (ID: ${studentId}) from ${section} was marked LATE on ${date} at ${arrivalTime || 'N/A'}. Please encourage on-time arrival. - SPCC Attendance System`;

  try {
    const message = await client.messages.create({
      body: messageBody,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    console.log('✅ Late SMS sent successfully:', message.sid);
    return { success: true, messageSid: message.sid };
  } catch (error) {
    console.error('❌ Error sending late SMS:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send PRESENT notification via SMS (For confirmations - optional)
 * @param {string} phoneNumber - Parent's phone number
 * @param {object} attendanceData - Attendance record
 * @returns {Promise}
 */
async function sendPresentSMS(phoneNumber, attendanceData) {
  if (process.env.TWILIO_ENABLED !== 'true' || !client) {
    return null;
  }

  if (!phoneNumber) {
    return null;
  }

  const { name, studentId, section, date, arrivalTime } = attendanceData;

  const messageBody = `✅ CONFIRMED: ${name} (ID: ${studentId}) from ${section} marked PRESENT on ${date} at ${arrivalTime}. - SPCC Attendance System`;

  try {
    const message = await client.messages.create({
      body: messageBody,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    console.log('✅ Present SMS sent:', message.sid);
    return { success: true, messageSid: message.sid };
  } catch (error) {
    console.error('❌ Error sending present SMS:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Batch send SMS to multiple phone numbers
 * Useful for sending same message (e.g., school closures) to all parents
 * @param {array} phoneNumbers - Array of phone numbers
 * @param {string} message - Message to send
 * @returns {Promise}
 */
async function sendBatchSMS(phoneNumbers, message) {
  if (process.env.TWILIO_ENABLED !== 'true' || !client) {
    return null;
  }

  const results = [];

  for (const phoneNumber of phoneNumbers) {
    try {
      const msg = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });
      results.push({ phoneNumber, success: true, messageSid: msg.sid });
    } catch (error) {
      results.push({ phoneNumber, success: false, error: error.message });
    }
  }

  return results;
}

module.exports = {
  sendAbsentSMS,
  sendLateSMS,
  sendPresentSMS,
  sendBatchSMS,
};
