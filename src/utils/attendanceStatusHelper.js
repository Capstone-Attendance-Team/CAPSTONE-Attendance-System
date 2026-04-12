/**
 * Attendance Status Helper (Frontend)
 * Determines attendance status based on arrival time
 * 
 * Default Time Thresholds (configurable):
 * - Present: Before LATE_THRESHOLD (7:30 AM)
 * - Late: Between LATE_THRESHOLD and ABSENT_THRESHOLD (7:30 AM - 8:30 AM)
 * - Absent: After ABSENT_THRESHOLD (8:30 AM)
 * 
 * TODO: Integrate with actual class schedule from database
 * This should fetch the correct time thresholds from school settings
 */

// Default thresholds - These should be configurable from school settings
const DEFAULT_LATE_THRESHOLD = '07:30'; // Start of late window
const DEFAULT_ABSENT_THRESHOLD = '08:30'; // Start of absent

/**
 * Calculate attendance status based on arrival time
 * @param {string} arrivalTime - Time in HH:mm or HH:mm:ss format (24-hour)
 * @param {string} lateThreshold - Optional: Time when student is considered late (default: 07:30)
 * @param {string} absentThreshold - Optional: Time when student is considered absent (default: 08:30)
 * @returns {string} - Status: 'present', 'late', or 'absent'
 */
export function getStatusByArrivalTime(arrivalTime, lateThreshold = DEFAULT_LATE_THRESHOLD, absentThreshold = DEFAULT_ABSENT_THRESHOLD) {
  if (!arrivalTime) {
    return 'absent';
  }

  // Normalize arrival time to HH:mm format
  const normalizedTime = arrivalTime.substring(0, 5);

  // Compare times
  if (normalizedTime <= lateThreshold) {
    return 'present';
  } else if (normalizedTime <= absentThreshold) {
    return 'late';
  } else {
    return 'absent';
  }
}

/**
 * Get color for status display
 * @param {string} status - Status: 'present', 'late', or 'absent'
 * @returns {object} - Color configuration with background and text color
 */
export function getStatusColor(status) {
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
export function getStatusWithColor(arrivalTime, lateThreshold = DEFAULT_LATE_THRESHOLD, absentThreshold = DEFAULT_ABSENT_THRESHOLD) {
  const status = getStatusByArrivalTime(arrivalTime, lateThreshold, absentThreshold);
  const colorInfo = getStatusColor(status);

  return {
    status,
    ...colorInfo
  };
}
