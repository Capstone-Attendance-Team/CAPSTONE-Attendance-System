import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';
import './NotificationIcon.css';

const NotificationIcon = ({ unreadCount, onClick, color = '#2196F3' }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div className="notification-icon-container" onClick={onClick} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <FontAwesomeIcon icon={faBell} style={{ color: isHovered ? '#f8bb08' : color, cursor: 'pointer', fontSize: '20px', transition: 'color 0.2s' }} />
      {unreadCount > 0 && (
        <span className="notification-badge" style={{ backgroundColor: color }}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </div>
  );
};

export default NotificationIcon;
