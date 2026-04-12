import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInbox } from '@fortawesome/free-solid-svg-icons';
import './InboxIcon.css';


const InboxIcon = ({ onClick, unreadCount }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
  <span className="inbox-icon" onClick={onClick} title="Inbox" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
    <FontAwesomeIcon icon={faInbox} style={{ fontSize: '20px', color: isHovered ? '#f8bb08' : 'inherit', transition: 'color 0.2s' }} />
      {unreadCount > 0 && (
        <span className="inbox-badge">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </span>
  );
};

export default InboxIcon;
