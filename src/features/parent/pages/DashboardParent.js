import React, { useState, useEffect, useRef } from 'react';
import InboxIcon from '../../../shared/components/InboxIcon';
import { useUser } from '../../../shared/UserContext';
import { useNavigate } from 'react-router-dom';
import './styles/DashboardParent.css';
import { fetchInbox, fetchSentMessages, sendExcuseLetter, deleteMessage } from '../../../api/messageApi';
import { fetchAllTeachers } from '../../../api/userApi';
import { fetchStudents } from '../../../api/studentApi';
import { fetchAttendance } from '../../../../src/utils/attendanceApi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faHome, faUsers, faClipboard, faBullhorn, faEnvelope, faFileAlt, faSignOutAlt, faUser, faX } from '@fortawesome/free-solid-svg-icons';

function DashboardParent() {
  // Announcement unread count state
  const [announcementUnreadCount, setAnnouncementUnreadCount] = useState(0);
  const announcementUpdateRef = useRef();
  // Get current parent user from React context
  const { user: currentUser } = useUser();
  // Hamburger menu state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hoveredIcon, setHoveredIcon] = useState(null);
  // Close sidebar on navigation (mobile)
  const handleNav = (section) => {
    setActiveSection(section);
    setSidebarOpen(false);
  };
  // State for selected student details
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  // Inbox messages state must be declared before any use
  const [inboxMessages, setInboxMessages] = useState([]);
  const [sentMessages, setSentMessages] = useState(() => {
    try {
      const local = localStorage.getItem('parentSentExcuseLetters');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  });
  const [inboxView, setInboxView] = useState('received'); // 'received' or 'sent'
  // Unread inbox count
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);
  useEffect(() => {
    setUnreadInboxCount(Array.isArray(inboxMessages) ? inboxMessages.filter(msg => msg.status === 'unread').length : 0);
  }, [inboxMessages]);

  // Fetch inbox and update unread count immediately on login
  useEffect(() => {
    if (currentUser && currentUser._id) {
      fetchInboxMessages();
    }
  }, [currentUser]);

  // Mark as read handler
  async function handleMarkAsRead(msgId) {
    try {
      const { markMessageAsRead } = await import('../../../api/markMessageAsRead');
      await markMessageAsRead(msgId);
      setInboxMessages(msgs => msgs.map(m => m._id === msgId ? { ...m, status: 'read' } : m));
    } catch {}
  }
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [excuseLetters, setExcuseLetters] = useState([]);
  const [excuseForm, setExcuseForm] = useState({ reason: '', file: null, date: '', teacher: '' });
  const [teachers, setTeachers] = useState([]);
  // Fetch teachers on mount
  useEffect(() => {
    fetchAllTeachers().then(setTeachers).catch(() => setTeachers([]));
  }, []);
  const [excuseStatus, setExcuseStatus] = useState('');
  // Get current parent user from React context
  // const { user: currentUser } = useUser(); // Removed duplicate declaration
  const userId = currentUser?._id;
  const userRole = currentUser?.type || 'parent';
  let linkedStudentIds = [];
  if (Array.isArray(currentUser?.linkedStudent)) linkedStudentIds = currentUser.linkedStudent;
  else if (typeof currentUser?.linkedStudent === 'string' && currentUser.linkedStudent) linkedStudentIds = [currentUser.linkedStudent];
  else if (currentUser?.linkedStudent != null) linkedStudentIds = Array.from(currentUser.linkedStudent);
  // State for all students and linked students
  const [allStudents, setAllStudents] = useState([]);
  const [linkedStudents, setLinkedStudents] = useState([]);
  // Attendance records for linked students
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  // Filter date state and logic
  const [filterDate, setFilterDate] = useState('');
  const filteredAttendanceRecords = filterDate
    ? attendanceRecords.filter(rec => {
        // Normalize date comparison
        const recDate = rec.date ? String(rec.date) : '';
        const filterDateStr = String(filterDate);
        const match = recDate.startsWith(filterDateStr);
        if (!match) {
          console.log('[DEBUG] Attendance record date', recDate, 'does not match filterDate', filterDateStr);
        }
        return match;
      })
    : attendanceRecords;
  // Fetch attendance records for linked students
  useEffect(() => {
    async function fetchAndFilterAttendance() {
      try {
        const allAttendance = await fetchAttendance();
        // Collect all possible IDs for linked students
        const linkedStudentIds = linkedStudents.map(s => String(s.studentId)).filter(Boolean);
        const linkedStudentDbIds = linkedStudents.map(s => String(s._id)).filter(Boolean);
        console.log('[Parent Dashboard] Linked studentId values:', linkedStudentIds);
        console.log('[Parent Dashboard] Linked _id values:', linkedStudentDbIds);
        if (Array.isArray(allAttendance)) {
          console.log('[Parent Dashboard] Attendance record studentIds:', allAttendance.map(a => a.studentId));
          console.log('[Parent Dashboard] Attendance record _ids:', allAttendance.map(a => a._id));
        }
        const filtered = Array.isArray(allAttendance)
          ? allAttendance.filter(a => {
              const attId = String(a.studentId);
              const attDbId = a._id ? String(a._id) : null;
              const match = linkedStudentIds.includes(attId) || (attDbId && linkedStudentDbIds.includes(attDbId));
              if (!match) {
                console.log('[Parent Dashboard] Attendance record not matched:', a, 'against studentIds:', linkedStudentIds, 'and _ids:', linkedStudentDbIds);
              }
              return match;
            })
          : [];
        console.log('[Parent Dashboard] Filtered attendance records:', filtered);
        setAttendanceRecords(filtered);
      } catch (err) {
        console.error('[Parent Dashboard] Error fetching attendance:', err);
        setAttendanceRecords([]);
      }
    }
    if (linkedStudents.length > 0) {
      fetchAndFilterAttendance();
    } else {
      setAttendanceRecords([]);
    }
    // Also fetch attendance when switching to attendance section
    // eslint-disable-next-line
  }, [linkedStudents.length, JSON.stringify(linkedStudents), activeSection]);

  // Fetch all students and filter linked students
  useEffect(() => {
    fetchStudents().then(data => {
      let students = Array.isArray(data) ? data : (data.students || data.list || []);
      setAllStudents(students);
      // Always use string comparison for IDs
      const normalizedLinkedIds = linkedStudentIds.map(id => String(id));
      if (normalizedLinkedIds.length > 0) {
        setLinkedStudents(students.filter(s => normalizedLinkedIds.includes(String(s._id)) || normalizedLinkedIds.includes(String(s.studentId))));
      } else {
        setLinkedStudents([]);
      }
    }).catch(() => {
      setAllStudents([]);
      setLinkedStudents([]);
    });
  }, [userId, JSON.stringify(linkedStudentIds)]);
  //latest update announcement
  // ...existing code...

const [announcements, setAnnouncements] = useState([]);

// Merge and normalize announcements, guarantee unique id for each
useEffect(() => {
  // Load admin and teacher announcements from localStorage
  const adminAnnouncements = JSON.parse(localStorage.getItem('announcements')) || [];
  const teacherAnnouncements = JSON.parse(localStorage.getItem('teacherAnnouncements')) || [];
  // Filter admin announcements for parent audience
  const filteredAdmin = adminAnnouncements.filter(a => {
    if (!a.audience) return false;
    if (typeof a.audience === 'string') {
      return ['parent', 'parents', 'both', 'all'].includes(a.audience.toLowerCase());
    }
    if (Array.isArray(a.audience)) {
      return a.audience.some(aud =>
        ['parent', 'parents', 'both', 'all'].includes(String(aud).toLowerCase())
      );
    }
    return false;
  });
  // Merge and ensure each announcement has a unique id
  const merged = [...filteredAdmin, ...teacherAnnouncements].map(a => ({
    ...a,
    id: a.id || a._id || a.timestamp || a.createdAt || Math.random().toString(36).slice(2)
  })).sort((a, b) => {
    const dateA = new Date(a.createdAt || a.timestamp || a.date || 0).getTime();
    const dateB = new Date(b.createdAt || b.timestamp || b.date || 0).getTime();
    return dateB - dateA;
  });
  setAnnouncements(merged);
}, []);

// Correct unread announcement count logic
useEffect(() => {
  let readAnnouncements = [];
  try {
    readAnnouncements = JSON.parse(localStorage.getItem('parentReadAnnouncements')) || [];
  } catch {}
  const unread = Array.isArray(announcements)
    ? announcements.filter(a => !readAnnouncements.includes(a.id)).length
    : 0;
  setAnnouncementUnreadCount(unread);
}, [announcements]);

// When marking as read, always use announcement.id
function handleAnnouncementMarkAsRead(announcementId) {
  let readAnnouncements = [];
  try {
    readAnnouncements = JSON.parse(localStorage.getItem('parentReadAnnouncements')) || [];
  } catch {}
  if (!readAnnouncements.includes(announcementId)) {
    readAnnouncements.push(announcementId);
    localStorage.setItem('parentReadAnnouncements', JSON.stringify(readAnnouncements));
    setAnnouncementUnreadCount(count => Math.max(0, count - 1));
  }
}

// ...existing code...
  const handleDeleteMessage = async (id) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await deleteMessage(id);
      setInboxMessages(msgs => msgs.filter(m => m._id !== id));
    } catch (err) {
      alert('Failed to delete message: ' + err.message);
    }
  };

  const handleExcuseFormChange = (e) => {
    const { name, value, files } = e.target;

      const handleDeleteMessage = async (id) => {
      if (!window.confirm('Are you sure you want to delete this message?')) return;
      try {
        await deleteMessage(id);
        setInboxMessages(msgs => msgs.filter(m => m._id !== id));
      } catch (err) {
        alert('Failed to delete message: ' + err.message);
      }
      };
    if (name === 'file') {
      setExcuseForm(prev => ({ ...prev, file: files[0] }));
    } else {
      setExcuseForm(prev => ({ ...prev, [name]: value }));
    }
  };
  const handleExcuseFormSubmit = async (e) => {
    e.preventDefault();
    setExcuseStatus('Submitting...');
    const selectedTeacher = teachers.find(t => t._id === excuseForm.teacher);
    if (!selectedTeacher) {
      setExcuseStatus('Please select a valid teacher.');
      return;
    }
    // Debug: log teacherId and form
    console.log('[PARENT] Submitting excuse letter to teacherId:', excuseForm.teacher, 'form:', excuseForm);
  // currentUser is already available from context/global
  console.log('[PARENT] Current user:', currentUser);
    // Also log all teachers for dropdown
    console.log('[PARENT] Teachers list:', teachers);
    try {
      // Use FormData for file upload
      const formData = new FormData();
      formData.append('senderId', userId);
      formData.append('senderRole', userRole);
      formData.append('recipientId', selectedTeacher._id);
      formData.append('recipientRole', 'teacher');
      formData.append('reason', excuseForm.reason);
      formData.append('excuseDate', excuseForm.date);
      formData.append('subject', 'Excuse Letter');
      formData.append('type', 'excuse_letter');
      if (excuseForm.file) {
        formData.append('file', excuseForm.file);
      }
      const result = await sendExcuseLetter(formData, true); // pass true to indicate FormData
      // Create a new letter object for instant UI feedback
      const newLetter = {
        _id: result?._id || Math.random().toString(36).slice(2),
        reason: excuseForm.reason,
        recipient: excuseForm.teacher,
        sender: userId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        approverName: '',
        type: 'excuse_letter',
        fileName: excuseForm.file?.name || '',
        excuseDate: excuseForm.date,
      };
      
      setSentMessages(prev => {
        const updated = [newLetter, ...prev];
        try {
          localStorage.setItem('parentSentExcuseLetters', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setExcuseStatus('Submitted!');
      setExcuseForm({ reason: '', file: null, date: '', teacher: '' });
      // Refresh sent excuse letters after a short delay
      setTimeout(() => {
        fetchSentMessagesOnly();
        setExcuseStatus('');
      }, 2000);
    } catch (err) {
      setExcuseStatus('Failed to submit: ' + err.message);
    }
  };
  // latest update
  function handleAnnouncementMarkAsRead(announcementId) {
  let readAnnouncements = [];
  try {
    readAnnouncements = JSON.parse(localStorage.getItem('parentReadAnnouncements')) || [];
  } catch {}
  if (!readAnnouncements.includes(announcementId)) {
    readAnnouncements.push(announcementId);
    localStorage.setItem('parentReadAnnouncements', JSON.stringify(readAnnouncements));
    setAnnouncementUnreadCount(count => Math.max(0, count - 1));
  }
}

  // Fetch inbox and sent messages
  const fetchInboxMessages = async () => {
    try {
      const data = await fetchInbox(userId, userRole);
      setInboxMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      setInboxMessages([]);
    }
  };
  const fetchSentMessagesOnly = async () => {
    try {
      const data = await fetchSentMessages(userId);
      // Merge backend and local sentMessages, deduplicating by _id
      setSentMessages(prev => {
        const backendLetters = Array.isArray(data) ? data.filter(msg => msg.type === 'excuse_letter') : [];
        // Merge backend and local, deduplicate by _id
        const local = (() => { try { return JSON.parse(localStorage.getItem('parentSentExcuseLetters')) || []; } catch { return []; } })();
        const allLetters = [...local, ...backendLetters];
        const map = new Map();
        allLetters.forEach(l => map.set(l._id, l));
        const merged = Array.from(map.values());
        // Update localStorage with merged
        try { localStorage.setItem('parentSentExcuseLetters', JSON.stringify(merged)); } catch {}
        return merged;
      });
    } catch (err) {
      setSentMessages(prev => [...prev]); // keep local if backend fails
    }
  };
  useEffect(() => {
    if (activeSection === 'inbox') {
      fetchInboxMessages();
      fetchSentMessagesOnly();
    }
    if (activeSection === 'excuse') fetchSentMessagesOnly();
    // eslint-disable-next-line
  }, [activeSection]);

  // Define the primary color
  const primaryColor = '#010662';
  const gradientMain = `linear-gradient(90deg, ${primaryColor} 0%, #38b2ac 100%)`;
  const gradientAlt = `linear-gradient(135deg, #e6fffa 0%, #f7fafc 100%)`;
  const gradientCard = `linear-gradient(135deg, ${primaryColor} 0%, #38b2ac 100%)`;
  const gradientWarn = `linear-gradient(135deg, #f6ad55 0%, #ff4757 100%)`;
  const gradientInfo = `linear-gradient(135deg, #38b2ac 0%, ${primaryColor} 100%)`;
  // Remove duplicate handleNav declaration (already defined above for hamburger logic)
  // Header gradient and style
  const parentName = currentUser?.fullName || currentUser?.name || currentUser?.username || 'Parent';
  // ...existing code...
  const { setUser } = useUser();
  const handleLogout = () => {
    setUser(null); // Clear user context and localStorage
    navigate('/');
  };
  return (
    <div className="admin-dashboard-container" style={{ position: 'relative', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Hamburger menu button - above header */}
      {!sidebarOpen && (
      <button
        className="hamburger-menu-btn"
        style={{
          position: 'fixed',
          top: 24,
          left: 24,
          zIndex: 10001,
          background: 'transparent',
          border: 'none',
          borderRadius: 8,
          width: 48,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: 28
        }}
        aria-label="Open sidebar menu"
        onClick={() => setSidebarOpen(true)}
      >
        <FontAwesomeIcon icon={faBars} style={{color: '#fff', fontSize: '20px'}} />
      </button>
      )}
      {/* Header - fixed at top, full width */}
      <header
        style={{
          background: 'linear-gradient(90deg, #010162 0%, #1a1a8a 100%)',
          color: '#fff',
          padding: 0,
          borderBottom: '2px solid #010162',
          boxShadow: '0 2px 8px rgba(1,1,98,0.15)',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '25px 24px', paddingLeft: '80px', gap: '12px', cursor: 'pointer', minWidth: 0 }}>
          <img
            src="/images/spcc-logo.png"
            alt="SPCC Logo"
            className="navbar-logo"
            style={{ 
              height: '45px',
              width: 'auto',
              objectFit: 'contain',
              filter: 'brightness(1.1)',
              background: 'transparent',
              padding: '0',
              flexShrink: 0
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: '1.1' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#f8bb08', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SPCC</span>
            <span style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>Parent Dashboard</span>
          </div>
        </div>
        <div className="admin-user-info" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '25px 24px', flexShrink: 0 }}>
          <InboxIcon unreadCount={unreadInboxCount} onClick={() => setActiveSection('inbox')} color="#fff" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="User Profile"
              onMouseEnter={() => setHoveredIcon('userProfile')}
              onMouseLeave={() => setHoveredIcon(null)}
            >
              <FontAwesomeIcon icon={faUser} style={{color: hoveredIcon === 'userProfile' ? '#f8bb08' : '#fff', fontSize: '20px', transition: 'color 0.2s'}} />
            </button>
            <span className="username" style={{ color: '#fff', fontWeight: 600 }}>{parentName}</span>
          </div>
        </div>
      </header>
      {/* Sidebar */}
      <aside
        className="admin-sidebar"
        style={{
          background: '#010662',
          position: 'fixed',
          top: 0,
          left: sidebarOpen ? 0 : -260,
          width: 260,
          height: '100vh',
          zIndex: 10000,
          boxShadow: sidebarOpen ? '2px 0 16px rgba(1,6,98,0.10)' : 'none',
          transition: 'left 0.3s',
          paddingTop: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 18px 0 18px' }}>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar menu"
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: 28,
              cursor: 'pointer',
              marginLeft: 8
            }}
          >
            <FontAwesomeIcon icon={faX} style={{fontSize: '20px'}} />
          </button>
        </div>
        
        <nav className="admin-nav" style={{ marginTop: 18, paddingTop: '8px', paddingBottom: '24px' }}>
          <ul style={{ padding: 0, margin: 0, listStyle: 'none', width: '100%' }}>
            <li className={activeSection === 'overview' ? 'active' : ''} onClick={() => handleNav('overview')} style={{ background: activeSection === 'overview' ? '#fff' : 'transparent', color: activeSection === 'overview' ? '#010662' : '#fff', fontWeight: activeSection === 'overview' ? 700 : 500, padding: '12px 18px', borderRadius: 8, margin: '10px 12px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FontAwesomeIcon icon={faHome} style={{fontSize: '18px', color: (activeSection === 'overview') ? '#f8bb08' : 'inherit', transition: 'color 0.2s'}} />
              Overview
            </li>
            <li className={activeSection === 'students' ? 'active' : ''} onClick={() => handleNav('students')} style={{ background: activeSection === 'students' ? '#fff' : 'transparent', color: activeSection === 'students' ? '#010662' : '#fff', fontWeight: activeSection === 'students' ? 700 : 500, padding: '12px 18px', borderRadius: 8, margin: '10px 12px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FontAwesomeIcon icon={faUsers} style={{fontSize: '18px', color: (activeSection === 'students') ? '#f8bb08' : 'inherit', transition: 'color 0.2s'}} />
              Enrolled Students
            </li>
            <li className={activeSection === 'attendance' ? 'active' : ''} onClick={() => handleNav('attendance')} style={{ background: activeSection === 'attendance' ? '#fff' : 'transparent', color: activeSection === 'attendance' ? '#010662' : '#fff', fontWeight: activeSection === 'attendance' ? 700 : 500, padding: '12px 18px', borderRadius: 8, margin: '10px 12px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FontAwesomeIcon icon={faClipboard} style={{fontSize: '18px', color: (activeSection === 'attendance') ? '#f8bb08' : 'inherit', transition: 'color 0.2s'}} />
              Attendance
            </li>
            <li className={activeSection === 'announcements' ? 'active' : ''} onClick={() => handleNav('announcements')} style={{ background: activeSection === 'announcements' ? '#fff' : 'transparent', color: activeSection === 'announcements' ? '#010662' : '#fff', fontWeight: activeSection === 'announcements' ? 700 : 500, padding: '12px 18px', borderRadius: 8, margin: '10px 12px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
              <FontAwesomeIcon icon={faBullhorn} style={{fontSize: '18px', color: (activeSection === 'announcements') ? '#f8bb08' : 'inherit', transition: 'color 0.2s'}} />
              Announcements
              {announcementUnreadCount > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  background: '#ff4757',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '2px 8px',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}>{announcementUnreadCount}</span>
              )}
            </li>
            <li className={activeSection === 'inbox' ? 'active' : ''} onClick={() => handleNav('inbox')} style={{ background: activeSection === 'inbox' ? '#fff' : 'transparent', color: activeSection === 'inbox' ? '#010662' : '#fff', fontWeight: activeSection === 'inbox' ? 700 : 500, padding: '12px 18px', borderRadius: 8, margin: '10px 12px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FontAwesomeIcon icon={faEnvelope} style={{fontSize: '18px', color: (activeSection === 'inbox') ? '#f8bb08' : 'inherit', transition: 'color 0.2s'}} />
              Inbox {unreadInboxCount > 0 && (<span style={{ color: '#ff4757', fontWeight: 'bold', marginLeft: 6 }}>{unreadInboxCount}</span>)}
            </li>
            <li className={activeSection === 'excuse' ? 'active' : ''} onClick={() => handleNav('excuse')} style={{ background: activeSection === 'excuse' ? '#fff' : 'transparent', color: activeSection === 'excuse' ? '#010662' : '#fff', fontWeight: activeSection === 'excuse' ? 700 : 500, padding: '12px 18px', borderRadius: 8, margin: '10px 12px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FontAwesomeIcon icon={faFileAlt} style={{fontSize: '18px', color: (activeSection === 'excuse') ? '#f8bb08' : 'inherit', transition: 'color 0.2s'}} />
              Excuse Letter
            </li>
            <li onClick={() => { setSidebarOpen(false); handleLogout(); }} style={{ background: '#ff4757', color: '#fff', fontWeight: 700, padding: '12px 18px', borderRadius: 8, margin: '16px 12px 8px 12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <FontAwesomeIcon icon={faSignOutAlt} style={{fontSize: '18px'}} />
              Logout
            </li>
          </ul>
        </nav>
      </aside>
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(1,6,98,0.18)',
            zIndex: 9999,
            transition: 'background 0.2s'
          }}
        />
      )}
      {/* Main content, shifts right on mobile when sidebar is open */}
      <main
        className="admin-main-content"
        style={{
          marginLeft: sidebarOpen ? 260 : 0,
          marginTop: 80, // match thicker header
          transition: 'margin-left 0.25s cubic-bezier(.4,1.6,.6,1), transform 0.25s cubic-bezier(.4,1.6,.6,1)',
          transform: sidebarOpen ? 'translateX(260px)' : 'translateX(0)',
        }}
      >
        {activeSection === 'inbox' && (
          <div style={{ maxWidth: '1000px', minWidth: 'min(100vw, 600px)', margin: '0 auto', padding: '32px 0 32px 0' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 28, color: primaryColor }}>
              <span role="img" aria-label="inbox">📥</span> Inbox
            </h2>
            <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
              <button
                className="dashboard-btn"
                style={{ background: inboxView === 'received' ? primaryColor : '#fff', color: inboxView === 'received' ? '#fff' : primaryColor, fontWeight: 700, border: `2px solid ${primaryColor}` }}
                onClick={() => setInboxView('received')}
              >Received</button>
              <button
                className="dashboard-btn"
                style={{ background: inboxView === 'sent' ? primaryColor : '#fff', color: inboxView === 'sent' ? '#fff' : primaryColor, fontWeight: 700, border: `2px solid ${primaryColor}` }}
                onClick={() => setInboxView('sent')}
              >Sent</button>
            </div>
            <button onClick={fetchInboxMessages} style={{ margin: '16px 0', padding: '8px 18px', background: primaryColor, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Refresh Inbox</button>
            <div style={{ background: '#f7fafc', borderRadius: 12, boxShadow: `0 2px 12px ${primaryColor}22`, padding: '32px 48px', marginTop: 24, minHeight: 500, maxHeight: '70vh', overflowY: 'auto', width: '100%', boxSizing: 'border-box' }}>
              {inboxView === 'received' ? (
                inboxMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#888' }}>No messages in your inbox.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {inboxMessages.map(msg => {
                      // Determine if sent or received (sent if sender is current parent)
                      const isSent = msg.senderId === userId;
                      let senderName = 'Unknown';
                      if (isSent) {
                        senderName = currentUser?.fullName || currentUser?.name || currentUser?.username || 'You';
                      } else if (msg.sender?.role === 'teacher' && msg.sender?.id) {
                        const t = teachers.find(u => u._id === msg.sender.id);
                        senderName = t ? (t.fullName || t.username || t.email || msg.sender.id) : msg.sender.id;
                      } else if (msg.sender?.role === 'admin') {
                        senderName = 'Admin';
                      } else if (msg.sender?.role === 'parent' && msg.sender?.id) {
                        senderName = 'Parent';
                      } else if (msg.senderName) {
                        senderName = msg.senderName;
                      }
                      const avatar = isSent
                        ? (currentUser?.photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser?.fullName || currentUser?.name || currentUser?.username || 'Parent'))
                        : ('https://ui-avatars.com/api/?name=' + encodeURIComponent(senderName));
                      return (
                        <div key={msg._id} style={{
                          display: 'flex',
                          flexDirection: isSent ? 'row-reverse' : 'row',
                          alignItems: 'flex-end',
                          gap: 12,
                          justifyContent: isSent ? 'flex-end' : 'flex-start',
                        }}>
                          <img src={avatar} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', background: '#e3f2fd', border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }} />
                          <div style={{
                            background: isSent ? primaryColor : '#fff',
                            color: isSent ? '#fff' : '#333',
                            borderRadius: isSent ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            padding: '14px 18px',
                            minWidth: 80,
                            maxWidth: 340,
                            boxShadow: '0 2px 8px rgba(33,150,243,0.07)',
                            marginBottom: 2,
                            textAlign: 'left',
                            position: 'relative',
                          }}>
                            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 15 }}>
                              {isSent ? 'You' : senderName}
                              {msg.type === 'excuse_letter' && <span style={{ marginLeft: 8, color: '#38b2ac' }}>Excuse Letter</span>}
                            </div>
                            <div style={{ fontSize: '1.05rem', marginBottom: 6, wordBreak: 'break-word' }}>{msg.content}</div>
                            {/* Show approver name if excuse letter is approved */}
                            {msg.type === 'excuse_letter' && msg.approverName && (
                              <div style={{ margin: '6px 0', color: '#38b2ac', fontWeight: 700 }}>
                                Approved by: {msg.approverName}
                              </div>
                            )}
                            {msg.type === 'excuse_letter' && msg.fileUrl && (
                              <div style={{ margin: '8px 0' }}>
                                <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" download style={{ color: isSent ? '#fff' : primaryColor, fontWeight: 600, textDecoration: 'underline' }}>
                                  View Excuse Letter File
                                </a>
                              </div>
                            )}
                            <div style={{ fontSize: '0.92rem', color: isSent ? '#e0e8f7' : '#888', marginTop: 8 }}>
                              {new Date(msg.createdAt).toLocaleString()}
                            </div>
                            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                              {msg.status === 'unread' && !isSent && (
                                <button onClick={() => handleMarkAsRead(msg._id)} style={{ background: primaryColor, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 600, cursor: 'pointer' }}>Mark as Read</button>
                              )}
                              <button onClick={() => handleDeleteMessage(msg._id)} style={{ background: '#fff', color: '#e53e3e', border: '1px solid #e53e3e', borderRadius: 6, padding: '4px 12px', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                sentMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#888' }}>No sent excuse letters.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {sentMessages.map(msg => {
                      // Show teacher name for sent excuse letter
                      const teacherName = teachers.find(t => t._id === (msg.recipient?.id || msg.recipient))?.fullName || 'Unknown';
                      return (
                        <div key={msg._id} style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 12, justifyContent: 'flex-start' }}>
                          <img src={'https://ui-avatars.com/api/?name=' + encodeURIComponent(teacherName)} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', background: '#e3f2fd', border: `2px solid ${primaryColor}`, boxShadow: `0 1px 4px ${primaryColor}22` }} />
                          <div style={{ background: '#fff', color: '#333', borderRadius: '18px 18px 18px 4px', padding: '14px 18px', minWidth: 80, maxWidth: 340, boxShadow: `0 2px 8px ${primaryColor}22`, marginBottom: 2, textAlign: 'left', position: 'relative' }}>
                            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 15 }}>
                              Excuse Letter to {teacherName}
                            </div>
                            <div style={{ fontSize: '1.05rem', marginBottom: 6, wordBreak: 'break-word' }}>{msg.content}</div>
                            {/* Show approver name if excuse letter is approved */}
                            {msg.status === 'approved' && (
                              <div style={{ margin: '6px 0', color: '#38b2ac', fontWeight: 700 }}>
                                Approved by: {msg.approverName || teacherName}
                              </div>
                            )}
                            {msg.fileUrl && (
                              <div style={{ margin: '8px 0' }}>
                                <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" download style={{ color: primaryColor, fontWeight: 600, textDecoration: 'underline' }}>
                                  View Excuse Letter File
                                </a>
                              </div>
                            )}
                            <div style={{ fontSize: '0.92rem', color: '#888', marginTop: 8 }}>
                              {new Date(msg.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        )}
        {activeSection === 'excuse' && (
          <div style={{ padding: '32px', maxWidth: 800, margin: '0 auto' }}>
            <h2 style={{ marginBottom: 8, fontWeight: 900, fontSize:'2rem', background: gradientMain, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: 1, textAlign:'center' }}>
              <span style={{marginRight:8, fontSize:'2.2rem'}}>📄</span>Excuse Letter Submission
            </h2>
            <form onSubmit={handleExcuseFormSubmit} style={{background: gradientAlt, borderRadius:18, padding:'32px 40px', boxShadow:`0 6px 32px ${primaryColor}22`, display:'flex', flexDirection:'column', gap:20, maxWidth:540, margin:'0 auto', border:`2px solid ${primaryColor}`}}>
              <div style={{fontWeight:700,fontSize:'1.15rem',marginBottom:4,color:primaryColor}}>Select Teacher:</div>
              <select name="teacher" value={excuseForm.teacher} onChange={handleExcuseFormChange} required style={{marginBottom:8,background:'#e6fffa',borderRadius:8,padding:'10px 0',border:`1px solid ${primaryColor}`,fontSize:'1.05rem', color: primaryColor}}>
                <option value="">-- Select a Teacher --</option>
                {teachers.map(t => (
                  <option key={t._id} value={t._id}>{t.fullName || t.name || t.username}</option>
                ))}
              </select>
              {teachers.length === 0 && (
                <div style={{color:'red',marginTop:8}}>No teachers found. Please contact the administrator.</div>
              )}
              <div style={{fontWeight:700,fontSize:'1.15rem',marginBottom:4,color:primaryColor}}>Reason for Absence:</div>
              <textarea name="reason" value={excuseForm.reason} onChange={handleExcuseFormChange} required style={{minHeight:70,padding:14,borderRadius:10,border:`1.5px solid ${primaryColor}`,fontSize:'1.05rem',background:'#fff',boxShadow:`0 2px 8px ${primaryColor}22`, color: primaryColor}} placeholder="Describe the reason for absence..." />
              <div style={{fontWeight:700,fontSize:'1.15rem',marginBottom:4,color:primaryColor}}>Date of Absence:</div>
              <input type="date" name="date" value={excuseForm.date} onChange={handleExcuseFormChange} required style={{marginBottom:8,background:'#e6fffa',borderRadius:8,padding:'8px 0',border:`1px solid ${primaryColor}`, color: primaryColor}} />
              <div style={{fontWeight:700,fontSize:'1.15rem',marginBottom:4,color:primaryColor}}>Upload Supporting Document:</div>
              <input type="file" name="file" accept="image/*,.pdf,.doc,.docx" onChange={handleExcuseFormChange} style={{marginBottom:8,background:'#e6fffa',borderRadius:8,padding:'8px 0',border:`1px solid ${primaryColor}`, color: primaryColor}} />
              <button type="submit" style={{marginTop:8,background: gradientMain, color:'#fff',borderRadius:10,padding:'12px 0',fontWeight:900,border:'none',fontSize:'1.15rem',cursor:'pointer',boxShadow:`0 2px 8px ${primaryColor}22`,letterSpacing:1,transition:'transform 0.1s'}}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <span style={{marginRight:8,fontSize:'1.2rem'}}>📨</span>Submit Excuse Letter
              </button>
              {excuseStatus && <div style={{marginTop:8,color:primaryColor,fontWeight:700,fontSize:'1.08rem',textAlign:'center',animation:'fadeIn 1s'}}>{excuseStatus}</div>}
            </form>
            <div style={{marginTop:40}}>
              <h3 style={{fontWeight:900,color:primaryColor,marginBottom:20,fontSize:'1.3rem',textAlign:'center',letterSpacing:1}}><span style={{marginRight:8,fontSize:'1.3rem'}}>�</span>Submitted Excuse Letters</h3>
              {sentMessages.length === 0 ? (
                <div style={{background:'linear-gradient(90deg, #fffbea 0%, #e6fffa 100%)',padding:'22px',borderRadius:12,color:'#f6ad55',fontWeight:700,boxShadow:'0 2px 8px rgba(246,173,85,0.10)',textAlign:'center',fontSize:'1.08rem'}}>No excuse letters submitted yet.</div>
              ) : (
                <div style={{display:'flex',flexWrap:'wrap',gap:24,justifyContent:'center'}}>
                  {sentMessages.map(letter => {
                    const teacherName = teachers.find(t => t._id === (letter.recipient?.id || letter.recipient))?.fullName || 'Unknown';
                    return (
                      <div key={letter._id} style={{background: gradientCard, borderRadius:16, boxShadow:`0 6px 32px ${primaryColor}22`, padding:'24px 28px', minWidth:260, maxWidth:340, display:'flex', flexDirection:'column', gap:12, position:'relative', color:'#fff', border:`2px solid #fff`}}>
                        <div style={{position:'absolute',top:18,right:18,fontSize:'2rem',opacity:0.13}}>📄</div>
                        <div style={{fontWeight:900,fontSize:'1.15rem',marginBottom:4,letterSpacing:1}}><span style={{marginRight:8}}>📝</span>{letter.reason}</div>
                        {/* Show approver name if excuse letter is approved */}
                        {letter.status === 'approved' && (
                          <div style={{color:'#fffbea',fontWeight:700,marginBottom:4}}>Approved by: {letter.approverName || teacherName}</div>
                        )}
                        <div style={{fontSize:'1.05rem',color:'#e6fffa'}}>
                          <span style={{fontWeight:700}}>File:</span> {letter.fileName ? (
                            <span style={{color:'#fff',background:'rgba(56,178,172,0.18)',borderRadius:6,padding:'2px 8px',marginLeft:4}}><span style={{marginRight:4}}>📎</span>{letter.fileName}</span>
                          ) : 'N/A'}
                        </div>
                        <div style={{fontWeight:900,fontSize:'1.05rem',marginTop:6}}>
                          Status: {letter.status === 'Pending' ? (
                            <span style={{color:'#fffbea',background:'rgba(246,173,85,0.18)',borderRadius:6,padding:'2px 12px',fontWeight:700,animation:'pulse 1.2s infinite'}}>
                              <span style={{marginRight:4}}>⏳</span>Pending
                            </span>
                          ) : (
                            <span style={{color:'#e6fffa',background:'rgba(56,178,172,0.18)',borderRadius:6,padding:'2px 12px',fontWeight:700}}>
                              <span style={{marginRight:4}}>✔️</span>{letter.status}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Add keyframes for pulse animation */}
            <style>{`
              @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(246,173,85,0.25); }
                70% { box-shadow: 0 0 0 10px rgba(246,173,85,0.05); }
                100% { box-shadow: 0 0 0 0 rgba(246,173,85,0.0); }
              }
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
            `}</style>
          </div>
        )}
        {activeSection === 'overview' && (
          <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto' }}>
            <h2 style={{ marginBottom: 8, fontWeight: 800, color: primaryColor, letterSpacing: 1 }}>Dashboard Overview</h2>
            <p style={{ marginBottom: 24, fontSize: '1.1rem', color: '#2d3e50', fontWeight: 500 }}>Welcome, Parent! Here is a quick summary of your account.</p>
            <div style={{ display: 'flex', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px', background: gradientInfo, borderRadius: 14, padding: '24px 32px', boxShadow: `0 4px 24px ${primaryColor}22`, textAlign: 'center', color: '#fff', minWidth: 180, position: 'relative' }}>
                <span style={{ position: 'absolute', top: 18, right: 18, fontSize: 28, opacity: 100 }}>👨‍👧‍👦</span>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 8 }}>{linkedStudents.length}</div>
                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Linked Students</div>
              </div>
              <div style={{ flex: '1 1 220px', background: gradientCard, borderRadius: 14, padding: '24px 32px', boxShadow: `0 4px 24px ${primaryColor}22`, textAlign: 'center', color: '#fff', minWidth: 180, position: 'relative' }}>
                <span style={{ position: 'absolute', top: 18, right: 18, fontSize: 28, opacity: 100 }}>📋</span>
                {(() => {
                  // Only show today's attendance records for linked students
                  const today = new Date().toISOString().slice(0, 10);
                  const todaysRecords = attendanceRecords.filter(rec => {
                    // rec.date may be in YYYY-MM-DD or Date object
                    let recDate = '';
                    if (rec.date) {
                      recDate = typeof rec.date === 'string' ? rec.date.slice(0, 10) : new Date(rec.date).toISOString().slice(0, 10);
                    } else if (rec.timestamp) {
                      recDate = new Date(rec.timestamp).toISOString().slice(0, 10);
                    }
                    return recDate === today;
                  });
                  return (
                    <>
                      <div style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 8 }}>{todaysRecords.length}</div>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Today's Attendance Records</div>
                      {/* Only show the total count, not the list */}
                    </>
                  );
                })()}
              </div>
              <div style={{ flex: '1 1 220px', background: gradientWarn, borderRadius: 14, padding: '24px 32px', boxShadow: `0 4px 24px #ff475722`, textAlign: 'center', color: '#fff', minWidth: 180, position: 'relative' }}>
                <span style={{ position: 'absolute', top: 18, right: 18, fontSize: 28, opacity: 100 }}>📢</span>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 8 }}>{announcementUnreadCount}</div>
                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Unread Announcements</div>
                </div>
            </div>
            <div style={{ marginBottom: 32, background: '#f7fafc', borderRadius: 12, padding: '24px 32px', boxShadow: `0 2px 8px ${primaryColor}22` }}>
              <h3 style={{ marginBottom: 16, fontWeight: 700, color: primaryColor }}>Recently Linked Students</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                {(
                  linkedStudents.length === 0 ? (
                    <li style={{ color: '#888', fontWeight: 500 }}>No linked students found.</li>
                  ) : (
                    linkedStudents.map(s => (
                      <li key={s._id || s.studentId} style={{ background: '#e6fffa', borderRadius: 8, padding: '14px 24px', fontWeight: 600, color: primaryColor, minWidth: 160, boxShadow: `0 2px 8px ${primaryColor}10` }}>
                        {s.fullName || s.name} <span style={{ color: primaryColor, fontWeight: 500 }}>({s.section || s.sectionName || '-'})</span>
                      </li>
                    ))
                  )
                )}
              </ul>
            </div>
            <div style={{ background: gradientMain, borderRadius: 10, padding: '20px 32px', color: '#fff', fontWeight: 600, fontSize: '1.1rem', boxShadow: `0 2px 8px ${primaryColor}22`, textAlign: 'center' }}>
              <span>📅 Latest school update: Parent-Teacher meeting on <b>September 15, 2025</b>.</span>
            </div>
          </div>
        )}
        {activeSection === 'students' && (
          <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto' }}>
            <h2 style={{ marginBottom: 8, fontWeight: 800, color: '#2196F3', letterSpacing: 1 }}>Linked Students</h2>
            <p style={{ marginBottom: 24, fontSize: '1.1rem', color: '#2d3e50', fontWeight: 500 }}>View and manage your connected students here.</p>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {linkedStudents.length === 0 ? (
                <div style={{ color: '#888', fontWeight: 600 }}>No linked students found.</div>
              ) : (
                linkedStudents.map(student => (
                  <div key={student._id || student.studentId} style={{ flex: '1 1 260px', background: 'linear-gradient(135deg, #38b2ac 0%, #2196F3 100%)', borderRadius: 14, padding: '24px 32px', boxShadow: '0 4px 24px rgba(33,150,243,0.10)', color: '#fff', minWidth: 220, position: 'relative', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                      <img src={student.photo && student.photo.trim() !== '' ? student.photo : '/spcclogo.png'} alt="Student Avatar" style={{ width: 54, height: 54, borderRadius: '50%', marginRight: 18, border: '3px solid #fff', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{student.fullName}</div>
                        <div style={{ fontWeight: 500, fontSize: '1rem', color: '#e6fffa' }}>{student.section || student.sectionName || '-'}</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 8 }}>Status: <span style={{ color: '#e6fffa' }}>Active</span></div>
                    <button style={{ background: '#fff', color: '#2196F3', borderRadius: 8, padding: '8px 18px', border: 'none', fontWeight: 700, cursor: 'pointer', marginTop: 8 }} onClick={() => setSelectedStudentId(student._id || student.studentId)}>View Details</button>
                  </div>
                ))
              )}
            </div>
            {/* Show student details if selected */}
            {selectedStudentId && linkedStudents.some(s => (s._id || s.studentId) === selectedStudentId) && (
              linkedStudents.filter(s => (s._id || s.studentId) === selectedStudentId).map(student => (
                <>
                  {/* Overlay */}
                  <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(33, 150, 243, 0.18)',
                    zIndex: 1000,
                    animation: 'fadeInOverlay 0.3s'
                  }} onClick={()=>setSelectedStudentId(null)} />
                  {/* Details Card */}
                  <div key={student._id || student.studentId}
                    style={{
                      marginTop: 24,
                      background: '#fff',
                      borderRadius: 16,
                      padding: '40px 48px',
                      boxShadow: '0 8px 32px rgba(33,150,243,0.18)',
                      maxWidth: 520,
                      marginLeft: 'auto',
                      marginRight: 'auto',
                      position: 'fixed',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%) scale(1)',
                      zIndex: 1001,
                      animation: 'slideInCard 0.35s cubic-bezier(.4,1.6,.6,1)'
                    }}
                    tabIndex={0}
                    aria-modal="true"
                    role="dialog"
                  >
                    <button
                      onClick={()=>setSelectedStudentId(null)}
                      aria-label="Close details"
                      style={{
                        position:'absolute',
                        top:18,
                        right:18,
                        background:'#ff4757',
                        color:'#fff',
                        border:'none',
                        borderRadius:'50%',
                        width:36,
                        height:36,
                        fontWeight:900,
                        fontSize:22,
                        boxShadow:'0 2px 8px rgba(255,71,87,0.13)',
                        cursor:'pointer',
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'center',
                        transition:'background 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background='#e84118'}
                      onMouseOut={e => e.currentTarget.style.background='#ff4757'}
                    >
                      ×
                    </button>
                    <div style={{display:'flex',alignItems:'center',gap:36,marginBottom:28}}>
                      <img src={student.photo && student.photo.trim() !== '' ? student.photo : '/spcclogo.png'} alt="Student" style={{width:110,height:110,borderRadius:'50%',objectFit:'cover',background:'#e3f2fd',border:'3px solid #2196F3',boxShadow:'0 2px 12px #e3f2fd'}} />
                      <div>
                        <div style={{fontSize:28,fontWeight:800,marginBottom:10,letterSpacing:0.5}}>{student.fullName || student.name}</div>
                        <div style={{fontSize:17,color:'#555',marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:18,marginRight:4}}>🏫</span>
                          <b>Section:</b> {student.section || student.sectionName || '-'}
                        </div>
                        <div style={{fontSize:17,color:'#555',marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:18,marginRight:4}}>🆔</span>
                          <b>Student ID:</b> {student.studentId || student._id}
                        </div>
                      </div>
                    </div>
                    <hr style={{border:'none',borderTop:'1.5px solid #e3f2fd',margin:'18px 0 20px 0'}} />
                    <div style={{marginTop:8}}>
                      <div style={{fontSize:18,color:'#333',marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:20,marginRight:4}}>✅</span>
                        <b>Status:</b> <span style={{color:'#38b2ac',fontWeight:700}}>Active</span>
                      </div>
                      <div style={{fontSize:17, color:'#333', marginTop:18}}>
                        <b>Teachers in Section:</b>
                        <div style={{marginTop:6}}>
                          {(
                            teachers.filter(t => Array.isArray(t.assignedSections) && t.assignedSections.some(sec => sec.sectionName === (student.section || student.sectionName))).length === 0 ? (
                              <span style={{color:'#888'}}>No teachers found for this section.</span>
                            ) : (
                              teachers.filter(t => Array.isArray(t.assignedSections) && t.assignedSections.some(sec => sec.sectionName === (student.section || student.sectionName))).map(t => (
                                <div key={t._id} style={{color:'#3182ce',fontWeight:600,marginBottom:4}}>
                                  {t.fullName || t.name || t.username}
                                  <div style={{fontSize:'0.98rem',color:'#555',marginLeft:8}}>
                                    Contact: {t.contact || 'N/A'}
                                  </div>
                                </div>
                              ))
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Animations */}
                  <style>{`
                    @keyframes fadeInOverlay {
                      from { opacity: 0; }
                      to { opacity: 1; }
                    }
                    @keyframes slideInCard {
                      from { opacity: 0; transform: translate(-50%, -60%) scale(0.97); }
                      to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    }
                  `}</style>
                </>
              ))
            )}
          
        </div>
      )}
      {activeSection === 'attendance' && (
          <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto' }}>
            <h2 style={{ marginBottom: 8, fontWeight: 800, color: '#2196F3', letterSpacing: 1 }}>Attendance Records</h2>
            <p style={{ marginBottom: 24, fontSize: '1.1rem', color: '#2d3e50', fontWeight: 500 }}>Check your students' attendance history and details.</p>
            <div style={{marginBottom:24,display:'flex',alignItems:'center',gap:12}}>
              <label htmlFor="attendance-date" style={{fontWeight:600}}>Filter by Date:</label>
              <input id="attendance-date" type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{padding:'6px 12px',borderRadius:6,border:'1px solid #b6d0f7',fontWeight:500}} />
              <button onClick={()=>setFilterDate('')} style={{padding:'6px 14px',borderRadius:6,background:'#eee',fontWeight:600,border:'none',cursor:'pointer'}}>Clear</button>
            </div>
            <div style={{ boxShadow: '0 4px 24px rgba(33,150,243,0.10)', border: '1px solid #e2e8f0', background: '#fff', borderRadius: 18, padding: '0', marginBottom: 32, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 600 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                  <tr style={{ background: 'linear-gradient(90deg, #2196F3 0%, #38b2ac 100%)', color: '#fff' }}>
                    <th style={{ padding: '16px 10px', fontWeight: 800, fontSize: '1.08rem', letterSpacing: 0.5, textAlign: 'left', position: 'sticky', top: 0, background: 'inherit' }}>Date</th>
                    <th style={{ padding: '16px 10px', fontWeight: 800, fontSize: '1.08rem', letterSpacing: 0.5, textAlign: 'left', position: 'sticky', top: 0, background: 'inherit' }}>Time</th>
                    <th style={{ padding: '16px 10px', fontWeight: 800, fontSize: '1.08rem', letterSpacing: 0.5, textAlign: 'left', position: 'sticky', top: 0, background: 'inherit' }}>Section</th>
                    <th style={{ padding: '16px 10px', fontWeight: 800, fontSize: '1.08rem', letterSpacing: 0.5, textAlign: 'left', position: 'sticky', top: 0, background: 'inherit' }}>Student</th>
                    <th style={{ padding: '16px 10px', fontWeight: 800, fontSize: '1.08rem', letterSpacing: 0.5, textAlign: 'left', position: 'sticky', top: 0, background: 'inherit' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendanceRecords.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: '#888', fontWeight: 500, padding: 32 }}>No attendance records found.</td></tr>
                  ) : (
                    filteredAttendanceRecords.map((rec, idx) => {
                      // Match student using only numeric studentId
                      const student = linkedStudents.find(s => String(s.studentId) === String(rec.studentId));
                      if (!student) {
                        console.log('[DEBUG] No matching student for attendance record:', rec);
                        return null;
                      }
                      let badgeColor = '#38b2ac', badgeBg = '#e6fffa', badgeText = 'Present';
                      if (rec.status && rec.status.toLowerCase() === 'late') { badgeColor = '#f6ad55'; badgeBg = '#fffbea'; badgeText = 'Late'; }
                      else if (rec.status && rec.status.toLowerCase() === 'absent') { badgeColor = '#ff4757'; badgeBg = '#ffeaea'; badgeText = 'Absent'; }
                      else if (rec.status && rec.status.toLowerCase() === 'present') { badgeColor = '#38b2ac'; badgeBg = '#e6fffa'; badgeText = 'Present'; }
                      return (
                        <tr key={rec._id || idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f7fafc', transition: 'background 0.2s', cursor: 'pointer' }}
                          onMouseOver={e => e.currentTarget.style.background = '#e3f2fd'}
                          onMouseOut={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#f7fafc'}>
                          <td style={{ padding: '14px 10px', fontWeight: 500 }}>{rec.date ? new Date(rec.date).toLocaleDateString() : '-'}</td>
                          <td style={{ padding: '14px 10px', fontWeight: 500 }}>
                            {rec.timestamp ? new Date(rec.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : (rec.time || '-')}
                          </td>
                          <td style={{ padding: '14px 10px', fontWeight: 500 }}>{student.section || student.sectionName || '-'}</td>
                          <td style={{ padding: '14px 10px', fontWeight: 500 }}>{student.fullName || student.name || '-'}</td>
                          <td style={{ padding: '14px 0', fontWeight: 700 }}>
                            <span style={{ color: badgeColor, background: badgeBg, borderRadius: 8, padding: '6px 18px', fontWeight: 800, fontSize: '1.01rem', letterSpacing: 0.5, boxShadow: '0 1px 4px rgba(33,150,243,0.07)' }}>{badgeText}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <style>{`
              @media (max-width: 700px) {
                .admin-main-content table { font-size: 0.97rem; }
                .admin-main-content th, .admin-main-content td { padding: 10px 4px !important; }
              }
            `}</style>
          </div>
        )}
        {activeSection === 'announcements' && (
  <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto' }}>
    <h2 style={{ marginBottom: 8, fontWeight: 800, color: '#2196F3', letterSpacing: 1 }}>Announcements</h2>
    <p style={{ marginBottom: 24, fontSize: '1.1rem', color: '#2d3e50', fontWeight: 500 }}>Stay updated with the latest school news and announcements.</p>
    <div style={{ marginBottom: 18, fontWeight: 700, color: '#f6ad55', fontSize: '1.08rem' }}>
      Unread Announcements: {announcementUnreadCount}
    </div>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {announcements.length === 0 ? (
        <div style={{ color: '#888', fontWeight: 600 }}>No announcements yet.</div>
      ) : (
        announcements.map(announcement => {
          let readAnnouncements = [];
          try {
            readAnnouncements = JSON.parse(localStorage.getItem('parentReadAnnouncements')) || [];
          } catch {}
          const isRead = readAnnouncements.includes(announcement.id || announcement.timestamp);

          return (
            <div
              key={announcement.id || announcement.timestamp}
              style={{
                background: isRead
                  ? 'linear-gradient(135deg, #e6fffa 0%, #f7fafc 100%)'
                  : 'linear-gradient(135deg, #2196F3 0%, #38b2ac 100%)',
                borderRadius: 14,
                padding: '24px 32px',
                boxShadow: '0 4px 24px rgba(33,150,243,0.10)',
                color: isRead ? '#333' : '#fff',
                position: 'relative'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: 8 }}>
                {announcement.title || announcement.message}
              </div>
              <div style={{ fontWeight: 500, fontSize: '1rem', marginBottom: 12 }}>
                {announcement.createdAt
                  ? new Date(announcement.createdAt).toLocaleString()
                  : (announcement.timestamp
                      ? new Date(announcement.timestamp).toLocaleString()
                      : (announcement.date || ''))}
              </div>
              <div style={{ fontWeight: 400, fontSize: '1rem', marginBottom: 12 }}>
                {announcement.content || announcement.message}
              </div>
              <span style={{
                background: '#fffbea',
                color: '#f6ad55',
                borderRadius: 8,
                padding: '6px 16px',
                fontWeight: 600,
                fontSize: '0.95rem',
                position: 'absolute',
                top: 24,
                right: 32
              }}>
                From: {announcement.postedBy || announcement.sender || 'Admin'}
              </span>
              {!isRead && (
                <button
                  onClick={() => handleAnnouncementMarkAsRead(announcement.id || announcement.timestamp)}
                  style={{
                    marginTop: 16,
                    background: '#fffbea',
                    color: '#f6ad55',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 18px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Mark as Read
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  </div>
)}
      </main>
      {/* Responsive styles for hamburger/sidebar */}
      <style>{`
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default DashboardParent;
