import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faCheck, faX, faTrash, faBullhorn } from '@fortawesome/free-solid-svg-icons';
import './NotificationDropdown.css';

const NotificationDropdown = ({
  notifications,
  isOpen,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete
}) => {
  if (!isOpen) return null;

  // Helper: prefer timestamp, fallback to createdAt, fallback to null
  const getDateString = (n) => n.timestamp || n.createdAt || null;

  // Format "time ago" or fallback to full date if invalid
  const formatTimeAgo = (n) => {
    const dateString = getDateString(n);
    if (!dateString) return 'No date';
    const time = new Date(dateString);
    if (isNaN(time.getTime())) return 'No date';
    const now = new Date();
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return time.toLocaleString();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ff4757';
      case 'medium': return '#ffa502';
      case 'low': return '#2ed573';
      default: return '#747d8c';
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains('notification-backdrop')) {
      onClose();
    }
  };

  return (
    <div className="notification-backdrop" onClick={handleBackdropClick}>
      <div className="notification-dropdown">
        <div className="notification-header">
          <h3 style={{display: 'flex', alignItems: 'center', gap: '8px', margin: 0}}>
            <FontAwesomeIcon icon={faBell} style={{fontSize: '20px'}} />
            Notifications
          </h3>
          <div className="notification-actions">
            {notifications.some(n => !(n.read ?? n.isRead)) && (
              <button
                className="mark-all-read-btn"
                onClick={onMarkAllAsRead}
                title="Mark all as read"
              >
                <FontAwesomeIcon icon={faCheck} style={{fontSize: '14px', marginRight: '4px'}} />
                All
              </button>
            )}
            <button
              className="close-btn"
              onClick={onClose}
              title="Close"
            >
              <FontAwesomeIcon icon={faX} style={{fontSize: '16px'}} />
            </button>
          </div>
        </div>
        <ul className="notification-list">
          {notifications.length === 0 ? (
            <li className="notification-empty">No notifications</li>
          ) : (
            notifications.map(n => (
              <li
                key={n._id || n.id}
                className={`notification-item ${!(n.read ?? n.isRead) ? 'unread' : 'read'}`}
                style={{
                  borderLeft: `4px solid ${getPriorityColor(n.priority)}`
                }}
              >
                <span className="notification-icon">
                  <FontAwesomeIcon icon={faBullhorn} style={{fontSize: '24px', color: '#ff4757'}} />
                </span>
                <div className="notification-info">
                  <div className="notification-title">
                    {n.title || n.message || n.content}
                  </div>
                  {/* Only show message if it's different from the title */}
                  {n.message && n.message !== n.title && n.message !== n.content && (
                    <div className="notification-message">{n.message}</div>
                  )}
                  {/* Only show content if it's different from both title and message */}
                  {n.content && n.content !== n.title && n.content !== n.message && (
                    <div className="notification-full-content">{n.content}</div>
                  )}
                  {n.sender && (
                    <div className="notification-sender" style={{ color: '#888', fontSize: '0.95em', marginTop: 2 }}>
                      <b>From:</b> {n.sender}
                    </div>
                  )}
                  <div className="notification-time">{formatTimeAgo(n)}</div>
                </div>
                <div className="notification-actions">
                  {!(n.read ?? n.isRead) && (
                    <button className="mark-read-btn" onClick={() => onMarkAsRead(n._id || n.id)} title="Mark as read">
                      <FontAwesomeIcon icon={faCheck} style={{fontSize: '16px'}} />
                    </button>
                  )}
                  <button className="delete-btn" onClick={() => onDelete(n._id || n.id)} title="Delete">
                    <FontAwesomeIcon icon={faTrash} style={{fontSize: '16px'}} />
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
        {notifications.length > 0 && (
          <div className="notification-footer">
            <p>{notifications.length} total notification{notifications.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;