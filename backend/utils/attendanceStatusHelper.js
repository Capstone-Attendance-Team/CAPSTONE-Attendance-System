/**
 * Attendance Status Helper
 * Determines attendance status based on arrival time
 * 
 * Updated Time Thresholds:
 * - Present: 7:00 AM - 7:30 AM (Before LATE_THRESHOLD)
 * - Late: 7:31 AM - 8:30 AM (Between LATE_THRESHOLD and ABSENT_THRESHOLD)
 * - Absent: After 8:31 AM (After ABSENT_THRESHOLD) - PARENT NOTIFIED
 * - Attendance window: 7:00 AM - 3:00 PM
 */

// Updated thresholds for email notification system
const DEFAULT_EARLY_OPEN = '07:00';  // Window opens
const DEFAULT_LATE_THRESHOLD = '07:31';  // Marks as late (was 7:30, now 7:31)
const DEFAULT_ABSENT_THRESHOLD = '08:31'; // Marks as absent & notifies parents (was 8:30, now 8:31)
const DEFAULT_ATTENDANCE_WINDOW_END = '15:00'; // 3:00 PM

/**
 * Calculate attendance status based on arrival time
 * @param {string} arrivalTime - Time in HH:mm or HH:mm:ss format (24-hour)
 * @param {string} lateThreshold - Optional: Time when student is considered late (default: 07:31)
 * @param {string} absentThreshold - Optional: Time when student is considered absent (default: 08:31)
 * @returns {string} - Status: 'present', 'late', or 'absent'
 */
function getStatusByArrivalTime(arrivalTime, lateThreshold = DEFAULT_LATE_THRESHOLD, absentThreshold = DEFAULT_ABSENT_THRESHOLD) {
  if (!arrivalTime) {
    return 'absent';
  }

  // Normalize arrival time to HH:mm format
  const normalizedTime = arrivalTime.substring(0, 5);

  // Compare times - Updated logic for new thresholds
  if (normalizedTime < lateThreshold) {
    return 'present'; // Before 7:31 AM
  } else if (normalizedTime <= absentThreshold) {
    return 'late'; // 7:31 AM to 8:31 AM
  } else {
    return 'absent'; // After 8:31 AM - PARENT NOTIFIED
  }
}

/**
 * Get color for status display
 * @param {string} status - Status: 'present', 'late', or 'absent'
 * @returns {object} - Color configuration with background and text color
 */
function getStatusColor(status) {
  const colors = {
    present: {
      background: '#d4edda',
      text: '#155724',
      borderColor: '#c3e6cb',
      label: 'Present'
    },
    late: {
      background: '#fff3cd',
      text: '#856404',
      borderColor: '#ffeaa7',
      label: 'Late'
    },
    absent: {
      background: '#f8d7da',
      text: '#721c24',
      borderColor: '#f5c6cb',
      label: 'Absent'
    }
  };

  return colors[status] || colors.absent;
}

/**
 * Get status from arrival time and return with color info
 * @param {string} arrivalTime - Time in HH:mm or HH:mm:ss format
 * @param {string} lateThreshold - Optional: Time when student is considered late
 * @param {string} absentThreshold - Optional: Time when student is considered absent
 * @returns {object} - Status, color, and label information
 */
function getStatusWithColor(arrivalTime, lateThreshold = DEFAULT_LATE_THRESHOLD, absentThreshold = DEFAULT_ABSENT_THRESHOLD) {
  const status = getStatusByArrivalTime(arrivalTime, lateThreshold, absentThreshold);
  const colorInfo = getStatusColor(status);

  return {
    status,
    ...colorInfo
  };
}

module.exports = {
  getStatusByArrivalTime,
  getStatusColor,
  getStatusWithColor,
  DEFAULT_LATE_THRESHOLD,
  DEFAULT_ABSENT_THRESHOLD
};
