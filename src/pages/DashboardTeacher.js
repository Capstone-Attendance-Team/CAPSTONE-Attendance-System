
import React, { useState, useEffect, useCallback } from 'react';
import AttendanceBarGraphSVG from '../components/AttendanceBarGraphSVG';
import { useUser } from '../shared/UserContext';
import '../styles/DashboardTeacher.css';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../shared/useDashboard';
import { useNotifications } from '../shared/hooks/useNotifications';
import NotificationIcon from '../shared/components/NotificationIcon';
import InboxIcon from '../shared/components/InboxIcon';
import NotificationDropdown from '../shared/components/NotificationDropdown';
import AnnouncementForm from '../shared/components/AnnouncementForm';
import AnnouncementList from '../shared/components/AnnouncementList';
import { deleteMessage } from '../api/messageApi';
import { fetchAllParents, fetchAllTeachers } from '../api/userApi';
import { fetchStudents } from '../api/studentApi';
import { fetchTodayAttendanceSummary } from '../api/attendanceApi';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faHome, faEnvelope, faBullhorn, faClipboard, faCamera, faListCheck, faUser, faSignOutAlt, faX } from '@fortawesome/free-solid-svg-icons';



// Today's Attendance Summary component for dashboard overview
function TodayAttendanceSummary({ studentsInSections }) {
  const [summary, setSummary] = useState({ present: 0, late: 0, absent: 0 });

  useEffect(() => {
    fetchTodayAttendanceSummary()
      .then((data) => {
        setSummary({
          present: data.present || 0,
          late: data.late || 0,
          absent: data.absent || 0,
        });
      })
      .catch(() => setSummary({ present: 0, late: 0, absent: 0 }));
  }, []);

  return (
    <div
      className="dashboard-card redesigned-card"
      style={{
        background: '#ffeaea',
        border: '2px solid #010662',
        padding: '24px 18px',
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(1,6,98,0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        minHeight: 220,
      }}
    >
      <div
        className="dashboard-card-icon"
        style={{ fontSize: 32, color: '#010662', marginBottom: 8 }}
      >
        📝
      </div>

      <div
        className="dashboard-card-title"
        style={{ fontWeight: 700, fontSize: 20, marginBottom: 8, color: '#010662' }}
      >
        Today&#39;s Attendance
      </div>

      {/* LATE BAR GRAPH */}
      <div
        style={{
          width: '100%',
          maxWidth: 260,
          height: 12,
          background: '#ffe0a3',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${summary.late > 0 ? summary.late : 2}%`,
            background: '#FFA500',
            height: '100%',
            borderRadius: 6,
          }}
        ></div>
      </div>

      <AttendanceBarGraphSVG
        present={summary.present}
        late={summary.late}
        absent={summary.absent}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: 220,
          marginTop: 8,
        }}
      >
        <span style={{ color: '#38a169', fontWeight: 500 }}>
          Present: {summary.present}
        </span>
       
        <span style={{ color: '#ff4757', fontWeight: 500 }}>
          Absent: {summary.absent}
        </span>
      </div>

      <div
        className="dashboard-card-desc"
        style={{ marginTop: 8, color: '#222', fontSize: 15 }}
      >
        Attendance summary for today
      </div>
    </div>
  );
}


// Helper to fetch user info by id
async function fetchUserName(userId) {
	try {
		const res = await fetch(`${process.env.REACT_APP_API_URL}/api/user/${userId}`);
		if (!res.ok) return userId;
		const user = await res.json();
		return user.fullName || user.username || user.email || userId;
	} catch {
		return userId;
	}
}


function TodayAttendanceList() {
  const [attendance, setAttendance] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch with better error handling
    const fetchInitialAttendance = async () => {
      setLoading(true);
      try {
        const apiUrl = `${process.env.REACT_APP_API_URL}/api/attendance/today`;
        console.log('Fetching from:', apiUrl);
        
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        // Handle different response formats
        let attendanceList = [];
        if (Array.isArray(data)) {
          attendanceList = data;
        } else if (data.attendance && Array.isArray(data.attendance)) {
          attendanceList = data.attendance;
        } else if (data.data && Array.isArray(data.data)) {
          attendanceList = data.data;
        }
        
        console.log('Initial attendance fetched:', attendanceList);
        setAttendance(attendanceList);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch attendance:', err);
        setError(err.message);
        setAttendance([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialAttendance();

    // Connect to WebSocket server
    const wsUrl = `${process.env.REACT_APP_WS_URL}/attendance`;
    console.log('Connecting to WebSocket:', wsUrl);
    
    // Validate WebSocket URL before connecting
    if (!wsUrl || wsUrl.includes('undefined')) {
      console.error('Invalid WebSocket URL:', wsUrl);
      setError('WebSocket configuration error. Check .env file.');
      return;
    }
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setError(null);
    };
    
    ws.onmessage = event => {
      try {
        const newRecord = JSON.parse(event.data);
        console.log('New attendance record received:', newRecord);
        setAttendance(prev => [newRecord, ...prev]);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = error => {
      console.error('WebSocket error:', error);
      setError('Real-time connection failed. Showing cached data.');
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontWeight: 700, fontSize: 24, color: '#010662', marginBottom: 16 }}>
        📋 Today's Attendance
      </h2>

      {error && (
        <div style={{ 
          background: '#ffeaea', 
          color: '#cc0000', 
          padding: 12, 
          borderRadius: 8, 
          marginBottom: 16, 
          fontSize: 14,
          border: '1px solid #ff4757'
        }}>
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: 40, 
          color: '#888',
          fontSize: 16
        }}>
          Loading attendance records...
        </div>
      )}

      {!loading && (
        <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            marginTop: 20,
            boxShadow: '0 2px 8px rgba(1,6,98,0.08)',
            borderRadius: 8,
            overflow: 'hidden'
          }}>
          <thead>
            <tr style={{ background: '#010662', color: '#fff' }}>
              <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Student Name</th>
              <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Student ID</th>
              <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Status</th>
              <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Time</th>
            </tr>
          </thead>

          <tbody>
            {attendance.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ 
                  textAlign: 'center', 
                  padding: 40, 
                  color: '#888',
                  fontSize: 15
                }}>
                  No attendance recorded today
                </td>
              </tr>
            ) : (
              attendance.map((a, index) => (
                <tr 
                  key={a._id || `${a.studentId}-${a.time}-${index}`} 
                  style={{ 
                    borderBottom: '1px solid #eee',
                    background: index % 2 === 0 ? '#fafbfc' : '#fff',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f0f4ff'}
                  onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? '#fafbfc' : '#fff'}
                >
                  <td style={{ padding: 12, color: '#222', fontWeight: 500 }}>
                    {a.studentName || 'Unknown'}
                  </td>
                  <td style={{ padding: 12, color: '#555' }}>
                    {a.studentId || 'N/A'}
                  </td>
                  <td style={{ padding: 12 }}>
                    <span style={{
                      background: a.status === 'Present' ? '#e6fffa' : 
                                 
                                 a.status === 'Absent' ? '#ffeaea' : '#f0f0f0',
                      color: a.status === 'Present' ? '#38b2ac' : 
                             
                             a.status === 'Absent' ? '#ff4757' : '#888',
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 13,
                      display: 'inline-block'
                    }}>
                      {a.status || 'Unknown'}
                    </span>
                  </td>
                  <td style={{ padding: 12, color: '#555', fontSize: 14 }}>
                    {a.time ? new Date(a.time).toLocaleTimeString() : 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {!loading && attendance.length > 0 && (
        <div style={{ 
          marginTop: 16, 
          color: '#666', 
          fontSize: 13,
          textAlign: 'right'
        }}>
          Total: {attendance.length} record{attendance.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}


function DashboardTeacher() {
    const [teacherMessageFile, setTeacherMessageFile] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [hoveredIcon, setHoveredIcon] = useState(null);
    const [showSendMessage, setShowSendMessage] = useState(false);
    const [inboxView, setInboxView] = useState('received');
    const { user: currentUser } = useUser();
	const {
  notifications: notificationList,
  unreadCount,
  isOpen,
  toggleNotifications,
  closeNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = useNotifications({ userId: currentUser._id, userRole: currentUser.type });
console.log('notificationList', notificationList);
    const [announcements, setAnnouncements] = useState([]);

	const unreadCountManual = notificationList.filter(n => !(n.read ?? n.isRead)).length;
	
	

useEffect(() => {
    // Fetch announcements from backend
    const fetchAnnouncements = async () => {
        try {
			const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/announcements`);
            // Filter announcements for teacher audience (same logic as before)
            const filtered = (res.data || []).filter(a =>
                a.audience === 'teacher' ||
                a.audience === 'both' ||
                a.audience === 'teachers' ||
                a.audience === 'all' ||
                (Array.isArray(a.audience) && (
                    a.audience.includes('teacher') ||
                    a.audience.includes('teachers') ||
                    a.audience.includes('both') ||
                    a.audience.includes('all')
                ))
            );
            setAnnouncements(filtered);
        } catch (err) {
            setAnnouncements([]); // fallback to empty if error
        }
    };
    fetchAnnouncements();
}, []);

    const [inboxMessages, setInboxMessages] = useState([]);
    const unreadInboxCount = inboxMessages.filter(
        msg => msg.status !== 'read' && (!msg.sender || msg.sender.id !== currentUser._id)
    ).length;

    const [profileData, setProfileData] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState(null);
    const [studentsInSections, setStudentsInSections] = useState(0);
    const [subjectsHandled, setSubjectsHandled] = useState(0);
    const [announcementSending, setAnnouncementSending] = useState(false);

    const handleSendAnnouncement = ({ title, message }) => {
        setAnnouncementSending(true);
        const existing = JSON.parse(localStorage.getItem('teacherAnnouncements') || '[]');
        const newAnnouncement = {
            id: Date.now(),
            title,
            message,
            sender: profileData?.fullName || currentUser?.fullName || 'Teacher',
            role: 'parents',
            timestamp: new Date().toISOString(),
        };
        localStorage.setItem('teacherAnnouncements', JSON.stringify([newAnnouncement, ...existing]));
        setAnnouncementSending(false);
    };

    // Fetch and count unique subjects handled by teacher
    useEffect(() => {
        if (!profileData) {
            setSubjectsHandled(0);
            return;
        }
        if (Array.isArray(profileData.subjects) && profileData.subjects.length > 0) {
            const uniqueSubjects = new Set(profileData.subjects.map(s => s.subjectName || s.name).filter(Boolean));
            setSubjectsHandled(uniqueSubjects.size);
            return;
        }
        if (Array.isArray(profileData.assignedSections) && profileData.assignedSections.length > 0) {
            const allSubjects = profileData.assignedSections.map(s => s.subjectName || s.name).filter(Boolean);
            const uniqueSubjects = new Set(allSubjects);
            setSubjectsHandled(uniqueSubjects.size);
            return;
        }
        setSubjectsHandled(0);
    }, [profileData]);
		// Fetch and count students in teacher's assigned sections
		
    useEffect(() => {
    async function fetchAndCountStudents() {
        // Debug: log profileData and assignedSections
        console.log('profileData:', profileData);
        if (
            !profileData ||
            !Array.isArray(profileData.assignedSections) ||
            profileData.assignedSections.length === 0
        ) {
            console.log('profileData is missing or assignedSections is empty!');
            setStudentsInSections(0);
            return;
        }
        try {
            const allStudents = await fetchStudents();
            const studentsArr = Array.isArray(allStudents)
                ? allStudents
                : (allStudents.students || allStudents.list || []);
            // Debug: log all students
            console.log('studentsArr:', studentsArr);

            const assignedSectionNames = profileData.assignedSections.map(
                s => (s.sectionName || s.name || s._id || s).toString().trim()
            );
            // Debug: log assigned section names
            console.log('assignedSectionNames:', assignedSectionNames);

            const matchedStudents = studentsArr.filter(stu =>
                assignedSectionNames.includes(
                    (stu.section || stu.sectionName || stu.assignedSection || stu.section_id || '').toString().trim()
                )
            );
            // Debug: log matched students
            console.log('matchedStudents:', matchedStudents);

            setStudentsInSections(matchedStudents.length);
        } catch (err) {
            console.error('Error fetching or counting students:', err);
            setStudentsInSections(0);
        }
    }
    fetchAndCountStudents();
}, [profileData]);

		const [activeSection, setActiveSection] = useState('overview');
		// Fetch teacher profile on mount and when switching to overview
		useEffect(() => {
			if (activeSection === 'overview' || !profileData) {
				fetchProfile();
			}
			// eslint-disable-next-line
		}, [activeSection]);
		const [showProfile, setShowProfile] = useState(false);
		const [inboxLoading, setInboxLoading] = useState(false);
		const [inboxError, setInboxError] = useState(null);

			// Message form state (admin-style)
			const [teacherMessageRecipientType, setTeacherMessageRecipientType] = useState('group'); // 'group' or 'specific'
			const [teacherMessageRecipient, setTeacherMessageRecipient] = useState(''); // group value
			const [teacherMessageSpecificUsers, setTeacherMessageSpecificUsers] = useState([]); // array of user ids
			const [teacherMessageUserSearch, setTeacherMessageUserSearch] = useState("");
			const [showUserDropdown, setShowUserDropdown] = useState(false);
			const [parentList, setParentList] = useState([]);
			const [teacherList, setTeacherList] = useState([]);
			const [userList, setUserList] = useState([]); // merged teacher+parent
			const [messageContent, setMessageContent] = useState("");
			const [messageSending, setMessageSending] = useState(false);
			const [messageError, setMessageError] = useState("");
			const [messageSuccess, setMessageSuccess] = useState("");
		// Sender name mapping state
		const [senderNames, setSenderNames] = useState({});

			// Fetch all parents and teachers for dropdowns
			useEffect(() => {
				Promise.all([
					fetchAllParents().catch(() => []),
					fetchAllTeachers().catch(() => [])
				]).then(([parents, teachers]) => {
					setParentList(parents);
					setTeacherList(teachers);
					setUserList([...teachers, ...parents]);
				});
			}, []);

		// Remove old userSearch/filter logic (now handled by teacherMessageUserSearch and userList)

			// Handler for sending teacher message (admin-style)
			const handleSendTeacherMessage = async (e) => {
  e.preventDefault();
  setMessageError("");
  setMessageSuccess("");
  setMessageSending(true);
  try {
    if (
      (teacherMessageRecipientType === 'group' && !teacherMessageRecipient) ||
      (teacherMessageRecipientType === 'specific' && teacherMessageSpecificUsers.length === 0) ||
      !messageContent.trim()
    ) {
      setMessageError("Please select recipient(s) and enter a message.");
      setMessageSending(false);
      return;
    }

    // Handle file upload (convert to base64)
    let fileUrl = null;
    if (teacherMessageFile) {
      fileUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(teacherMessageFile);
      });
    }

    let sentMsg = null;
    if (teacherMessageRecipientType === 'group') {
      const { sendAdminMessageToMany } = await import("../api/messageApi");
      await sendAdminMessageToMany({
        senderId: currentUser._id,
        senderRole: "teacher",
        recipientGroup: teacherMessageRecipient,
        content: messageContent,
        subject: "",
        fileUrl // send file to group
      });
      setMessageSuccess("Message sent to group.");
      sentMsg = {
        _id: 'sent-' + Date.now(),
        sender: { id: currentUser._id, role: 'teacher' },
        recipient: { id: teacherMessageRecipient, role: teacherMessageRecipient },
        type: 'message',
        subject: '',
        content: messageContent,
        status: 'sent',
        createdAt: new Date().toISOString(),
        fileUrl // attach file to local message
      };
    } else {
      // Send to specific users (multi)
      for (const userId of teacherMessageSpecificUsers) {
	const res = await fetch(`${process.env.REACT_APP_API_URL}/api/message/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: { id: currentUser._id, role: 'teacher' },
            recipient: { id: userId, role: getUserRoleById(userId) },
            type: 'message',
            subject: '',
            content: messageContent,
            fileUrl // send file to specific user
          })
        });
        if (!res.ok) throw new Error('Failed to send message');
      }
      setMessageSuccess("Message sent to selected users.");
      sentMsg = {
        _id: 'sent-' + Date.now(),
        sender: { id: currentUser._id, role: 'teacher' },
        recipient: { id: teacherMessageSpecificUsers.join(','), role: 'specific' },
        type: 'message',
        subject: '',
        content: messageContent,
        status: 'sent',
        createdAt: new Date().toISOString(),
        fileUrl // attach file to local message
      };
    }
    if (sentMsg) {
      // Persist sent teacher message in localStorage
      try {
        const local = localStorage.getItem('teacherSentMessages');
        let arr = local ? JSON.parse(local) : [];
        arr = [sentMsg, ...arr];
        localStorage.setItem('teacherSentMessages', JSON.stringify(arr));
      } catch {}
      setInboxMessages(prev => [sentMsg, ...prev]);
    }
    setTeacherMessageRecipientType('group');
    setTeacherMessageRecipient('');
    setTeacherMessageSpecificUsers([]);
    setMessageContent('');
    setTeacherMessageFile(null); // clear file after sending
  } catch (err) {
    setMessageError(err.message || "Failed to send message");
  } finally {
    setMessageSending(false);
  }
};

		// Helper to get user role by id from dropdowns
		function getUserRoleById(id) {
			if (parentList.some(p => p._id === id)) return 'parent';
			if (teacherList.some(t => t._id === id)) return 'teacher';
			return '';
		}
		// Fetch sender names when inboxMessages changes
		useEffect(() => {
			const missing = inboxMessages.filter(msg => msg.sender && msg.sender.id && !senderNames[msg.sender.id]);
			if (missing.length > 0) {
				Promise.all(missing.map(msg => fetchUserName(msg.sender.id))).then(names => {
					const updates = {};
					missing.forEach((msg, i) => { updates[msg.sender.id] = names[i]; });
					setSenderNames(prev => ({ ...prev, ...updates }));
				});
			}
		}, [inboxMessages]);
	// Delete message handler for inbox (localStorage or backend)
	const handleDeleteInboxMessage = async (id) => {
		if (!window.confirm('Are you sure you want to delete this message?')) return;
		// Helper to check for valid MongoDB ObjectId
		const isValidObjectId = id => typeof id === 'string' && id.length === 24 && /^[a-fA-F0-9]+$/.test(id);
		if (!isValidObjectId(id)) {
			// LocalStorage message: remove from localStorage
			try {
				const local = localStorage.getItem('adminSentMessages');
				let arr = local ? JSON.parse(local) : [];
				arr = arr.filter(m => m._id !== id);
				localStorage.setItem('adminSentMessages', JSON.stringify(arr));
			} catch {}
			setInboxMessages(msgs => msgs.filter(m => m._id !== id));
		} else {
			// Backend message: delete via API
			try {
				const { deleteMessage } = await import('../api/messageApi');
				await deleteMessage(id);
				setInboxMessages(msgs => msgs.filter(m => m._id !== id));
			} catch (err) {
				alert('Failed to delete message: ' + err.message);
			}
		}
	};

	const teacherName = currentUser?.fullName || currentUser?.name || currentUser?.username || 'Teacher';
	const teacherPhoto = currentUser?.photo || '';
	const teacherBio = currentUser?.bio || '';

	// State for backend profile (keep only one set of declarations)

	// Fetch teacher profile from backend
	const fetchProfile = useCallback(async () => {
		setProfileLoading(true);
		setProfileError(null);
		try {
			// Try _id, id, then username
			let teacherId = currentUser?._id || currentUser?.id || currentUser?.username;
			// If still undefined, try currentUser._id or currentUser.id from backend
			if (!teacherId && typeof currentUser === 'object') {
				teacherId = currentUser._id || currentUser.id || currentUser.username;
			}
			if (!teacherId) throw new Error('No teacher ID found');
		const res = await fetch(`${process.env.REACT_APP_API_URL}/api/user/${teacherId}`);
			if (!res.ok) throw new Error('Failed to fetch profile');
			const data = await res.json();
			setProfileData(data);
		} catch (err) {
			setProfileError(err.message);
		} finally {
			setProfileLoading(false);
		}
	}, [currentUser]);

	const navigate = useNavigate();
		const { data: dashboardData, loading, error, refresh } = useDashboardData(30000);
	// (Removed duplicate state declarations for activeSection, showProfile, inboxMessages, inboxLoading, inboxError)

						// Use real MongoDB ObjectId for demo teacher if username fallback is used
								let teacherId = currentUser?._id || currentUser?.id;
								if (!teacherId || typeof teacherId !== 'string' || teacherId.length < 20) {
									// fallback to latest teacher ObjectId from new excuse letters
									teacherId = '68ddaae1cec196f60b186e24';
								}

		// Fetch inbox from backend
		// Keep local sent messages (with _id starting with 'sent-') after refresh
		const fetchInboxMessages = async () => {
			setInboxLoading(true);
			setInboxError(null);
			try {
				const { fetchInbox } = await import('../api/messageApi');
				let data = await fetchInbox(teacherId, 'teacher');
				// Merge admin messages from localStorage
				let adminMessages = [];
				try {
					const local = localStorage.getItem('adminSentMessages');
					if (local) {
						const arr = JSON.parse(local);
						adminMessages = arr.filter(msg =>
							(msg.recipient && msg.recipient.id === teacherId) ||
							(msg.recipientGroup === 'teachers' || msg.recipientGroup === 'both')
						);
					}
				} catch {}
				// Merge teacher sent messages from localStorage
				let teacherSentMessages = [];
				try {
					const local = localStorage.getItem('teacherSentMessages');
					if (local) {
						teacherSentMessages = JSON.parse(local);
					}
				} catch {}
				// Avoid duplicates by _id
				const all = [...teacherSentMessages, ...adminMessages, ...data].filter((msg, idx, arr) =>
					arr.findIndex(m => m._id === msg._id) === idx
				);
				setInboxMessages(all);
			} catch (err) {
				setInboxError(err.message);
				setInboxMessages([]);
			} finally {
				setInboxLoading(false);
			}
		};

		// Mark message as read (localStorage or backend)
		const handleUpdateStatus = async (msgId, status) => {
			// Helper to check for valid MongoDB ObjectId
			const isValidObjectId = id => typeof id === 'string' && id.length === 24 && /^[a-fA-F0-9]+$/.test(id);
			// Find message in inboxMessages
			const msg = inboxMessages.find(m => m._id === msgId);
			if (!msg) return;
			let approverName = arguments.length > 2 ? arguments[2] : undefined;
			if (!isValidObjectId(msgId)) {
				// LocalStorage message: update status locally
				try {
					const local = localStorage.getItem('adminSentMessages');
					let arr = local ? JSON.parse(local) : [];
					arr = arr.map(m => m._id === msgId ? { ...m, status, approverName: status === 'approved' ? approverName : m.approverName } : m);
					localStorage.setItem('adminSentMessages', JSON.stringify(arr));
				} catch {}
				// Update local state
				setInboxMessages(prev => prev.map(m => m._id === msgId ? { ...m, status, approverName: status === 'approved' ? approverName : m.approverName } : m));
			} else {
				// Backend message: update via API
				try {
					const { updateMessageStatus } = await import('../api/messageApi');
					await updateMessageStatus(msgId, status, approverName);
					// Update local state immediately for responsiveness
					setInboxMessages(prev => prev.map(m => m._id === msgId ? { ...m, status, approverName: status === 'approved' ? approverName : m.approverName } : m));
				} catch (err) {
					alert('Failed to update status: ' + err.message);
				}
			}
		};

		useEffect(() => {
			// Always fetch inbox messages on sign in and when switching to inbox
			if (currentUser && currentUser._id) {
				fetchInboxMessages();
			}
			// Also fetch when switching to inbox section
			if (activeSection === 'inbox') fetchInboxMessages();
			// eslint-disable-next-line
		}, [currentUser, activeSection]);
  
	// Notification system
	const notifications = useNotifications(currentUser._id);

	// Navigation handlers
	const handleManageStudentClick = () => {
		navigate('/manage-student');
	};

	const handleManageAttendanceClick = () => {
		navigate('/manage-attendance');
	};


	const handleManageSubjectSectionClick = () => {
		navigate('/manage-subject-section');
	};

	const handleGoToFaceRecognition = () => {
		navigate('/facial-recognition');
	};

	// Logout handler
	const { setUser } = useUser();
	const handleLogout = () => {
	// Only log out when user clicks the logout button
	setUser(null); // Clear user context and localStorage
	navigate('/');
	};


		return (
			<div className="teacher-dashboard-container admin-dashboard-container">
				   {/* Hamburger button */}
				   {!sidebarOpen && (
				   <button
					   style={{
						   position: 'fixed',
						   top: 24,
						   left: 24,
						   zIndex: 10001,
						   background: 'transparent',
						   color: '#fff',
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
					   onClick={() => setSidebarOpen(true)}
					   aria-label="Open sidebar"
				   >
					   <FontAwesomeIcon icon={faBars} style={{color: '#fff', fontSize: '20px'}} />
				   </button>
				   )}

				   {/* Sidebar drawer */}
				   <aside
					   className="admin-sidebar"
					   style={{
						   position: 'fixed',
						   top: 0,
						   left: sidebarOpen ? 0 : -260,
						   width: 260,
						   height: '100vh',
						   background: '#010662',
						   color: '#fff',
						   zIndex: 10000,
						   boxShadow: sidebarOpen ? '2px 0 16px rgba(1,6,98,0.10)' : 'none',
						   transition: 'left 0.3s',
						   paddingTop: 0
					   }}
				   >
					   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 18px 0 18px' }}>
						   
						   <button
							   style={{ background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', marginLeft: 8 }}
							   onClick={() => setSidebarOpen(false)}
							   aria-label="Close sidebar"
						   >
							   <FontAwesomeIcon icon={faX} style={{fontSize: '20px'}} />
						   </button>
					   </div>
					   <nav className="admin-nav" style={{ marginTop: 18, paddingTop: '8px', paddingBottom: '24px' }}>
						   <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
							   <li className={activeSection === 'overview' ? 'active' : ''} onClick={() => { setActiveSection('overview'); setSidebarOpen(false); }} style={{ background: activeSection === 'overview' ? '#fff' : 'transparent', color: activeSection === 'overview' ? '#010662' : '#fff', fontWeight: activeSection === 'overview' ? 700 : 500, borderRadius: 8, margin: '10px 12px', padding: '12px 18px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
								   <FontAwesomeIcon icon={faHome} style={{fontSize: '18px', color: (activeSection === 'overview') ? '#f8bb08' : 'inherit', transition: 'color 0.2s'}} />
								   Dashboard Overview
							   </li>
							   <li className={activeSection === 'inbox' ? 'active' : ''} onClick={() => { setActiveSection('inbox'); setSidebarOpen(false); }} style={{ background: activeSection === 'inbox' ? '#fff' : 'transparent', color: activeSection === 'inbox' ? '#010662' : '#fff', fontWeight: activeSection === 'inbox' ? 700 : 500, borderRadius: 8, margin: '10px 12px', padding: '12px 18px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
								   <FontAwesomeIcon icon={faEnvelope} style={{fontSize: '18px', color: (activeSection === 'inbox') ? '#f8bb08' : 'inherit', transition: 'color 0.2s'}} />
								   Inbox {unreadInboxCount > 0 && (
									   <span style={{ color: '#ff4757', fontWeight: 'bold', marginLeft: 6 }}>{unreadInboxCount}</span>
								   )}
							   </li>
							   <li className={activeSection === 'announcement' ? 'active' : ''} onClick={() => { setActiveSection('announcement'); setSidebarOpen(false); }} style={{ background: activeSection === 'announcement' ? '#fff' : 'transparent', color: activeSection === 'announcement' ? '#010662' : '#fff', fontWeight: activeSection === 'announcement' ? 700 : 500, borderRadius: 8, margin: '10px 12px', padding: '12px 18px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
								   <FontAwesomeIcon icon={faBullhorn} style={{fontSize: '18px', color: (activeSection === 'announcement') ? '#f8bb08' : 'inherit', transition: 'color 0.2s'}} />
								   Announcement
							   </li>
							   <li onClick={() => { handleManageAttendanceClick(); setSidebarOpen(false); }} style={{ background: 'transparent', color: '#fff', fontWeight: 500, borderRadius: 8, margin: '10px 12px', padding: '12px 18px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
								   <FontAwesomeIcon icon={faClipboard} style={{fontSize: '18px', transition: 'color 0.2s'}} />
								   Attendance
							   </li>
							   {/* Removed Subjects from sidebar */}
							   <li onClick={() => { handleGoToFaceRecognition(); setSidebarOpen(false); }} style={{ background: 'transparent', color: '#fff', fontWeight: 500, borderRadius: 8, margin: '10px 12px', padding: '12px 18px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
								   <FontAwesomeIcon icon={faCamera} style={{fontSize: '18px', transition: 'color 0.2s'}} />
								   Facial Recognition
							   </li>
							   <li 
								className={activeSection === 'todayAttendance' ? 'active' : ''}
								onClick={() => { setActiveSection('todayAttendance'); setSidebarOpen(false); }}
								style={{
									background: activeSection === 'todayAttendance' ? '#fff' : 'transparent',
									color: activeSection === 'todayAttendance' ? '#010662' : '#fff',
									fontWeight: activeSection === 'todayAttendance' ? 700 : 500,
									borderRadius: 8,
									margin: '10px 12px',
									padding: '12px 18px',
									cursor: 'pointer',
									transition: 'background 0.2s',
									display: 'flex',
									alignItems: 'center',
									gap: '8px'
								}}
								>
								<FontAwesomeIcon icon={faListCheck} style={{fontSize: '18px', color: (activeSection === 'todayAttendance') ? '#f8bb08' : 'inherit', transition: 'color 0.2s'}} />
								Today Attendance
								</li>
								 <li 
								onClick={() => { 
								setSidebarOpen(false); 
								handleLogout(); 
								}}
								style={{ 
								background: '#ff4757', 
								color: '#fff', 
								fontWeight: 700, 
								borderRadius: 8, 
								margin: '16px 12px 8px 12px', 
								padding: '12px 18px', 
								cursor: 'pointer', 
								transition: 'all 0.2s',
								border: 'none',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								gap: '8px'
								}}
								className="logout-button"
							>
								<FontAwesomeIcon icon={faSignOutAlt} style={{fontSize: '18px'}} />
								Logout
							</li>
						   </ul>
					   </nav>
				   </aside>

				   {/* Overlay when sidebar is open */}
				   {sidebarOpen && (
					   <div
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
						   onClick={() => setSidebarOpen(false)}
					   />
				   )}
				<div className="admin-main-content" style={{ transition: 'margin-left 0.3s' }}>
					   <header className="admin-header" style={{ background: 'linear-gradient(90deg, #010162 0%, #1a1a8a 100%)', color: '#fff', borderBottom: '2px solid #010162', boxShadow: '0 2px 8px rgba(1,1,98,0.15)', padding: 0, position: 'sticky', top: 0, zIndex: 100 }}>
            <div className="admin-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '25px 24px', paddingLeft: '80px', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
              {/* Logo and School Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveSection('overview')}>
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
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: '1.3', gap: '4px' }}>
                  <span style={{ fontSize: '20px', fontWeight: '800', color: '#f8bb08', textTransform: 'uppercase', letterSpacing: '0.5px' }}>System Plus Computer College</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>Teacher Dashboard</span>
                </div>
              </div>

              <div className="admin-user-info" style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <NotificationIcon 
                    unreadCount={unreadCount}
                    onClick={toggleNotifications}
                    color="#fff"
                  />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      background: '#ff4757',
                      color: '#fff',
                      borderRadius: '50%',
                      padding: '2px 7px',
                      fontSize: 13,
                      fontWeight: 700,
                      border: '2px solid #fff',
                      zIndex: 2
                    }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <InboxIcon onClick={() => setActiveSection('inbox')} unreadCount={unreadInboxCount} color="#fff" />
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
                    onClick={() => { 
                      setShowProfile(true); 
                      fetchProfile(); 
                    }}
                  >
                    <FontAwesomeIcon icon={faUser} style={{color: hoveredIcon === 'userProfile' ? '#f8bb08' : '#fff', fontSize: '20px', transition: 'color 0.2s'}} />
                  </button>
                  <span className="username" style={{ color: '#fff', fontWeight: 600 }}>Teacher</span>
                </div>
                
              </div>
            </div>
          </header>
					<NotificationDropdown
						notifications={notificationList}
						isOpen={isOpen}
						onClose={closeNotifications}
						onMarkAsRead={markAsRead}
						onMarkAllAsRead={markAllAsRead}
						onDelete={deleteNotification}
						/>
						
					   <div className="admin-content" style={{ background: '#f4f6fa', minHeight: '100vh' }}>
						   {activeSection === 'overview' && (
							   <div className="dashboard-overview-section redesigned-overview">
								   <h2 style={{fontWeight:700, fontSize:28, color:'#010662', marginBottom:24, display:'flex',alignItems:'center',gap:10}}>
									   <span role="img" aria-label="dashboard">📊</span> Teacher Dashboard
								   </h2>
								   <div className="dashboard-overview-cards redesigned-cards" style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'32px'}}>
									   <div className="dashboard-card redesigned-card" style={{background:'#e3f2fd', border: '2px solid #010662'}}>
										   <div className="dashboard-card-icon" style={{fontSize:32, color:'#010662', marginBottom:8}}>📚</div>
										   <div className="dashboard-card-title">Assigned Subjects</div>
										   <div className="dashboard-card-value" style={{color:'#2196F3'}}>{subjectsHandled}</div>
										   <div className="dashboard-card-desc">Subjects you handle</div>
									   </div>
									   <div className="dashboard-card redesigned-card" style={{background:'#e3f2fd', border: '2px solid #010662'}}>
										   <div className="dashboard-card-icon" style={{fontSize:32, color:'#010662', marginBottom:8}}>🏫</div>
										   <div className="dashboard-card-title">Assigned Sections</div>
										   <div className="dashboard-card-value" style={{color:'#38b2ac'}}>{
											   (profileData && Array.isArray(profileData.assignedSections) && profileData.assignedSections.length > 0)
												   ? profileData.assignedSections.length
												   : 0
										   }</div>
										   <div className="dashboard-card-desc">Sections assigned to you</div>
									   </div>
									   <div className="dashboard-card redesigned-card" style={{background:'#e3f2fd', border: '2px solid #010662'}}>
										   <div className="dashboard-card-icon" style={{fontSize:32, color:'#010662', marginBottom:8}}>👥</div>
										   <div className="dashboard-card-title">Total Students</div>
										   <div className="dashboard-card-value" style={{color:'#f6ad55'}}>{studentsInSections}</div>
										   <div className="dashboard-card-desc">Students you handle</div>
									   </div>
									   {/* Move the existing TodayAttendanceSummary here for Present/Absent Today cards */}
									   <TodayAttendanceSummary studentsInSections={studentsInSections} />
								   </div>
							</div>
						)}
						{activeSection === 'todayAttendance' && (
								<TodayAttendanceList />
								)}
								{activeSection === 'inbox' && (
								<div className="inbox-section" style={{maxWidth: '900px', width: '100%', margin: '0 auto', padding: '32px 0'}}>
										<h2 style={{fontWeight: 700, fontSize: 28, color: '#2d3748', display:'flex',alignItems:'center',gap:8}}>
											<span role="img" aria-label="inbox">📥</span> Teacher Inbox
										</h2>
										{/* Toggle buttons for Received/Sent */}
										<div style={{display:'flex',gap:12,marginBottom:16}}>
											<button
												onClick={() => setInboxView('received')}
												style={{
													padding:'8px 18px',
													background: inboxView === 'received' ? '#3182ce' : '#e2e8f0',
													color: inboxView === 'received' ? '#fff' : '#222',
													border:'none',
													borderRadius:6,
													fontWeight:600,
													cursor:'pointer'
												}}
											>
												Received
											</button>
											<button
												onClick={() => setInboxView('sent')}
												style={{
													padding:'8px 18px',
													background: inboxView === 'sent' ? '#3182ce' : '#e2e8f0',
													color: inboxView === 'sent' ? '#fff' : '#222',
													border:'none',
													borderRadius:6,
													fontWeight:600,
													cursor:'pointer'
												}}
											>
												Sent
											</button>
											<div style={{flex:1}} />
											<button onClick={()=>setShowSendMessage(v=>!v)} style={{padding:'8px 18px',background:'#38a169',color:'#fff',border:'none',borderRadius:6,fontWeight:600,cursor:'pointer'}}>
												{showSendMessage ? 'Close' : '+ New Message'}
											</button>
											<button
												onClick={fetchInboxMessages}
												title="Refresh Inbox"
												style={{
													margin: '0',
													background: 'none',
													border: 'none',
													borderRadius: '50%',
													width: 40,
													height: 40,
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													cursor: 'pointer',
													color: '#3182ce',
													fontSize: 26,
													boxShadow: '0 1px 4px rgba(49,130,206,0.08)'
												}}
											>
												<span role="img" aria-label="refresh">🔄</span>
											</button>
										</div>
														{showSendMessage && (
															<div style={{background:'#fff',borderRadius:10,padding:'18px 24px',boxShadow:'0 2px 8px rgba(33,150,243,0.07)',marginBottom:24}}>
																<h3 style={{marginBottom:12}}>Send Message</h3>
																<form onSubmit={handleSendTeacherMessage} style={{display:'flex',flexDirection:'column',gap:12}}>
																	<div style={{display:'flex',gap:12,alignItems:'center'}}>
																		<label style={{fontWeight:500}}>To:</label>
																		<select value={teacherMessageRecipientType} onChange={e => { setTeacherMessageRecipientType(e.target.value); setTeacherMessageRecipient(''); setTeacherMessageSpecificUsers([]); }} style={{padding:'6px 12px',borderRadius:6}} required>
																			<option value="group">Group</option>
																			<option value="specific">Specific Users</option>
																		</select>
																		{teacherMessageRecipientType === 'group' && (
																			<select value={teacherMessageRecipient} onChange={e => setTeacherMessageRecipient(e.target.value)} style={{padding:'6px 12px',borderRadius:6}} required>
																				<option value="">Select group</option>
																				<option value="teachers">All Teachers</option>
																				<option value="parents">All Parents</option>
																				<option value="both">All Teachers & Parents</option>
																			</select>
																		)}
																		{teacherMessageRecipientType === 'specific' && (
																			<div style={{minWidth:220, position:'relative'}}>
																				<input
																					type="text"
																					placeholder="Search users..."
																					value={teacherMessageUserSearch}
																					onChange={e => {
																						setTeacherMessageUserSearch(e.target.value);
																						setShowUserDropdown(true);
																					}}
																					onFocus={() => setShowUserDropdown(true)}
																					style={{padding:'6px 10px',borderRadius:5,border:'1px solid #ccc',marginBottom:6,width:'100%'}}
																				/>
																				{showUserDropdown && (
																					<div style={{position:'absolute',zIndex:10,top:38,left:0,right:0,maxHeight:140,overflowY:'auto',border:'1px solid #eee',borderRadius:6,background:'#fff',boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
																						{userList.filter(u => (u.type === 'teacher' || u.type === 'parent') &&
																							!teacherMessageSpecificUsers.includes(u._id) && (
																								!teacherMessageUserSearch.trim() ||
																								(u.fullName && u.fullName.toLowerCase().includes(teacherMessageUserSearch.trim().toLowerCase())) ||
																								(u.username && u.username.toLowerCase().includes(teacherMessageUserSearch.trim().toLowerCase())) ||
																								(u.email && u.email.toLowerCase().includes(teacherMessageUserSearch.trim().toLowerCase()))
																							)
																						).slice(0,10).map(u => (
																							<div
																								key={u._id}
																								style={{padding:'6px 10px',cursor:'pointer',fontSize:15}}
																								onMouseDown={e => {
																									e.preventDefault();
																									setTeacherMessageSpecificUsers(prev => [...prev, u._id]);
																									setTeacherMessageUserSearch("");
																									setShowUserDropdown(false);
																								}}
																							>
																								{u.fullName || u.username} <span style={{color:'#888',fontSize:13}}>({u.type})</span>
																							</div>
																						))}
																						{userList.filter(u => (u.type === 'teacher' || u.type === 'parent') &&
																							!teacherMessageSpecificUsers.includes(u._id) && (
																								!teacherMessageUserSearch.trim() ||
																								(u.fullName && u.fullName.toLowerCase().includes(teacherMessageUserSearch.trim().toLowerCase())) ||
																								(u.username && u.username.toLowerCase().includes(teacherMessageUserSearch.trim().toLowerCase())) ||
																								(u.email && u.email.toLowerCase().includes(teacherMessageUserSearch.trim().toLowerCase()))
																							)
																						).length === 0 && (
																							<div style={{color:'#aaa',fontSize:14,padding:'6px 10px'}}>No users found.</div>
																						)}
																					</div>
																				)}
																			
																				<div style={{marginTop:6,display:'flex',flexWrap:'wrap',gap:6}}>
																					{teacherMessageSpecificUsers.map(id => {
																						const u = userList.find(u => u._id === id);
																						return u ? (
																							<span key={id} style={{background:'#e3f2fd',borderRadius:12,padding:'2px 10px',fontSize:13,display:'inline-flex',alignItems:'center',gap:4}}>
																								{u.fullName || u.username}
																								<button type="button" style={{marginLeft:2,background:'none',border:'none',color:'#ff4757',cursor:'pointer',fontWeight:'bold'}} onClick={() => setTeacherMessageSpecificUsers(prev => prev.filter(i => i !== id))}>×</button>
																							</span>
																						) : null;
																					})}
																				</div>
																			</div>
																		)}
																	</div>
																	<textarea
																		value={messageContent}
																		onChange={e => setMessageContent(e.target.value)}
																		placeholder="Type your message here..."
																		rows={3}
																		style={{padding:'8px 12px',borderRadius:6,border:'1px solid #ccc',resize:'vertical'}}
																		required
																	/>
																	<input
																				type="file"
																				accept="image/*,.pdf,.doc,.docx"
																				onChange={e => setTeacherMessageFile(e.target.files[0])}
																				style={{marginTop:8}}
																				/>
																	<div style={{display:'flex',gap:12,alignItems:'center'}}>
																		<button type="submit" className="dashboard-btn primary" disabled={messageSending}>
																			{messageSending ? 'Sending...' : 'Send'}
																		</button>
																		{messageError && <span style={{color:'#e53e3e'}}>{messageError}</span>}
																		{messageSuccess && <span style={{color:'#38a169'}}>{messageSuccess}</span>}
																	</div>
																</form>
															</div>
														)}
																				{/* Refresh button moved above, removed from here */}
										<div style={{background: '#f7fafc', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: 24, marginTop: 24}}>
											{inboxLoading ? (
												<div style={{textAlign:'center',color:'#888'}}>Loading...</div>
											) : inboxError ? (
												<div style={{textAlign:'center',color:'#e53e3e'}}>Error: {inboxError}</div>
											) : inboxMessages.length === 0 ? (
												<div style={{textAlign:'center',color:'#888'}}>No messages in your inbox.</div>
											) : (
												<div style={{display:'flex',flexDirection:'column',gap:18}}>
												{inboxMessages
  .filter(msg => {
    const isSent = msg.sender?.id === currentUser._id;
    return inboxView === 'sent' ? isSent : !isSent;
  })
  .map(msg => {
    const isSent = msg.sender?.id === currentUser._id;
    const isExcuse = msg.type === 'excuse_letter';
    const senderName = isSent
      ? (profileData?.fullName || teacherName)
      : (msg.sender?.id ? (senderNames[msg.sender.id] || '...') : 'Unknown');
    return (
      <div key={msg._id} style={{
        background:'#fff',
        borderRadius:14,
        padding:'20px 28px',
        boxShadow:'0 2px 12px rgba(33,150,243,0.08)',
        textAlign:'left',
        marginBottom:8,
        borderLeft: isSent ? '6px solid #3182ce' : '6px solid #38a169',
        position:'relative',
        opacity:msg._id && msg._id.toString().startsWith('sent-') ? 0.7 : 1
      }}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:6}}>
          <span style={{fontSize:22}}>{isExcuse ? '📄' : (isSent ? '📤' : '📥')}</span>
          <span style={{fontWeight:700,color:'#2b6cb0',fontSize:18}}>
            {isExcuse ? 'Excuse Letter' : 'Message'}
          </span>
          <span style={{
            marginLeft:10,
            background:isSent ? '#e3f2fd' : '#e6fffa',
            color:isSent ? '#3182ce' : '#38a169',
            borderRadius:8,
            fontSize:13,
            fontWeight:600,
            padding:'2px 10px',
            letterSpacing:0.5
          }}>{isSent ? 'Sent' : 'Received'}</span>
        </div>
        <div style={{marginBottom:8,fontSize:15}}>
          <span style={{color:'#888'}}>{isSent ? 'To: ' : 'From: '}</span>
          <span style={{color:'#222',fontWeight:500}}>
            {isSent
              ? (() => {
                  if (msg.recipient?.role === 'specific' && msg.recipient?.id) {
                    const ids = msg.recipient.id.split(',');
                    const names = ids.map(id => {
                      const u = userList.find(u => u._id === id);
                      return u ? (u.fullName || u.username || u.email || id) : id;
                    });
                    return names.join(', ');
                  } else if (msg.recipient?.role === 'teachers') {
                    return 'All Teachers';
                  } else if (msg.recipient?.role === 'parents') {
                    return 'All Parents';
                  } else if (msg.recipient?.role === 'both') {
                    return 'All Teachers & Parents';
                  } else if (msg.recipient?.name) {
                    return msg.recipient.name;
                  } else if (msg.recipient?.id) {
                    const u = userList.find(u => u._id === msg.recipient.id);
                    return u ? (u.fullName || u.username || u.email || msg.recipient.id) : msg.recipient.id;
                  } else {
                    return 'Unknown';
                  }
                })()
              : senderName}
          </span>
        </div>
        <div style={{fontSize:'1.08rem',color:'#333',marginBottom:10,whiteSpace:'pre-line'}}>
          {msg.content}
          {/* Show file attachment for any message */}
          {msg.fileUrl && (
            <div style={{marginTop:8}}>
              <a href={msg.fileUrl} download style={{color:'#3182ce',fontWeight:600,textDecoration:'underline',fontSize:15}}>
                📎 Download Attachment
              </a>
            </div>
          )}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:18,marginTop:6}}>
          <span style={{fontSize:13,color:'#888'}}>
            {isSent ? 'Sent' : 'Received'}: {new Date(msg.createdAt).toLocaleString()}
          </span>
          {msg.status && (
            <span style={{fontSize:13,color:'#888'}}>
              Status: <b style={{color:'#2b6cb0'}}>{msg.status}</b>
            </span>
          )}
          {/* Mark as Read button for received, unread messages */}
          {!isSent && msg.status !== 'read' && (
            <button onClick={() => handleUpdateStatus(msg._id, 'read')} style={{background:'#38a169',color:'#fff',border:'none',borderRadius:6,padding:'4px 12px',fontWeight:600,cursor:'pointer',fontSize:13}}>
              Mark as Read
            </button>
          )}
          {/* Approve button for excuse letter */}
          {isExcuse && !isSent && msg.status !== 'approved' && (
            <button onClick={() => handleUpdateStatus(msg._id, 'approved', profileData?.fullName || teacherName)} style={{background:'#3182ce',color:'#fff',border:'none',borderRadius:6,padding:'4px 12px',fontWeight:600,cursor:'pointer',fontSize:13}}>
              Approve
            </button>
          )}
        </div>
        <button onClick={()=>handleDeleteInboxMessage(msg._id)} style={{position:'absolute',top:18,right:18,background:'#fff',color:'#e53e3e',border:'1px solid #e53e3e',borderRadius:6,padding:'4px 12px',fontWeight:600,cursor:'pointer',fontSize:13}}>Delete</button>
      </div>
    );
  })
}
												</div>
											)}
										</div>
									</div>
								)}
						{activeSection === 'announcement' && (
							<div className="announcement-section" style={{maxWidth: 1600, margin: '0 auto', padding: '72px 96px'}}>
								<h2 style={{display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 28, color: '#2b6cb0'}}>
									<span role="img" aria-label="announcement">📢</span> Announcements
								</h2>
								<AnnouncementForm onSubmit={handleSendAnnouncement} loading={announcementSending} />
								<AnnouncementList />
							</div>
						)}
				</div>
					{showProfile && (
						<div className="modal-overlay">
							<div className="modal-content">
								<h2 style={{marginBottom:8}}>Teacher Profile</h2>
								<div style={{display:'flex',alignItems:'center',gap:24}}>
									<div>
										{/* Placeholder for photo, can be replaced with real photo field */}
										<div style={{width:100,height:100,borderRadius:'50%',background:'#e3f2fd',display:'flex',alignItems:'center',justifyContent:'center',fontSize:48,color:'#2196F3'}}>
											{profileData?.fullName ? profileData.fullName[0] : '👤'}
										</div>
									</div>
									<div>
										<div style={{fontSize:22,fontWeight:600}}>{profileData?.fullName || teacherName}</div>
										<div style={{marginTop:8,color:'#555'}}>Role: Teacher</div>
										<div style={{marginTop:8,color:'#555'}}>Email: {profileData?.email}</div>
										<div style={{marginTop:12}}><strong>Bio:</strong> {profileData?.bio || 'No bio set.'}</div>
										<div style={{marginTop:12}}><strong>Subjects:</strong> {
											(Array.isArray(profileData?.subjects) && profileData.subjects.length)
												? Array.from(new Set(profileData.subjects.map(s => s.subjectName || s.name).filter(Boolean))).join(', ')
												: (Array.isArray(profileData?.assignedSections) && profileData.assignedSections.length)
													? Array.from(new Set(profileData.assignedSections.map(s => s.subjectName || s.name).filter(Boolean))).join(', ')
													: 'None assigned.'
										}</div>
										<div style={{marginTop:12}}><strong>Sections:</strong> {
											Array.isArray(profileData?.assignedSections) && profileData.assignedSections.length
												? profileData.assignedSections.map(s => s.sectionName).join(', ')
												: 'None assigned.'
										}</div>
									</div>
								</div>
								<div style={{marginTop:24,textAlign:'right'}}>
									<button className="dashboard-btn" onClick={() => setShowProfile(false)}>Close</button>
								</div>
							</div>
							<style>{`
								.modal-overlay {
									position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 9999;
								}
								.modal-content {
									background: #fff; padding: 32px 24px; border-radius: 10px; box-shadow: 0 2px 16px rgba(0,0,0,0.15); min-width: 340px; max-width: 95vw;
								}
							`}</style>
						</div>
					)}
				</div>
			</div>
		);
	}
	
// Teacher Overview Component
function TeacherOverview({ dashboardData, onManageStudent, onManageAttendance, onManageSubjects, onFaceRecognition }) {
	const [attendanceSummary, setAttendanceSummary] = useState({ present: 0, late: 0, absent: 0 });
	useEffect(() => {
		fetchTodayAttendanceSummary().then(setAttendanceSummary).catch(() => setAttendanceSummary({ present: 0,late: 0,absent: 0 }));
	}, []);
	const [showProfile, setShowProfile] = useState(false);
	return (
		<div className="overview-section">
			<h2>📊 Teaching Overview</h2>
			{/* Stats Grid */}
			<div className="teacher-stats-grid">
				<div>
					<div className="teacher-stat-card">
						<h3>Classes Today</h3>
						<p className="stat-number">{dashboardData.todaysClasses}</p>
						<span>{dashboardData.todaysClasses} classes taught</span>
					</div>
					<div className="teacher-stat-card">
						<h3>Students Present</h3>
						<p className="stat-number">{dashboardData.studentsPresent}</p>
						<span>{dashboardData.attendancePercentage}% attendance</span>
					</div>
					<div className="teacher-stat-card">
						<h3>Total Subjects</h3>
						<p className="stat-number">{dashboardData.totalSubjects}</p>
						<span>Subjects managed</span>
					</div>
					<div className="teacher-stat-card">
						<h3>Total Students</h3>
						<p className="stat-number">{dashboardData.totalStudents}</p>
						<span>Students registered</span>
					</div>
				</div>
			</div>
			{/* Quick Actions */}
			<div className="quick-actions">
				<h3>⚡ Quick Actions</h3>
				<div className="action-buttons">
					<button className="action-btn primary" onClick={onFaceRecognition}>
						📷 Start Facial Recognition
					</button>
					<button className="action-btn secondary" onClick={onManageAttendance}>
						📝 Record Attendance
					</button>
					{/* Removed Manage Students quick action from Teacher overview */}
					<button className="action-btn quaternary" onClick={onManageSubjects}>
						📚 Manage Subjects
					</button>
				</div>
			</div>
			{/* Overall Attendance Summary */}
			<div className="overall-attendance-summary" style={{ display: 'flex', gap: '24px', margin: '32px 0' }}>
				<div style={{ background: '#e6fffa', borderRadius: 10, padding: '18px 32px', boxShadow: '0 2px 8px rgba(56,178,172,0.10)', textAlign: 'center', minWidth: 120 }}>
					<div style={{ fontSize: '2rem', color: '#38b2ac', fontWeight: 700 }}>{attendanceSummary.present}</div>
					<div style={{ color: '#38b2ac', fontWeight: 600 }}>Present</div>
				</div>
				
				<div style={{ background: '#ffeaea', borderRadius: 10, padding: '18px 32px', boxShadow: '0 2px 8px rgba(255,71,87,0.10)', textAlign: 'center', minWidth: 120 }}>
					<div style={{ fontSize: '2rem', color: '#ff4757', fontWeight: 700 }}>{attendanceSummary.absent}</div>
					<div style={{ color: '#ff4757', fontWeight: 600 }}>Absent</div>
				</div>
			</div>
			{/* Today's Analytics */}
			<div className="analytics-section">
				<h3>📈 Today's Analytics</h3>
				<div className="analytics-grid">
					<div className="analytics-card">
						<h4>📚 Subject Coverage</h4>
						<p>
							{dashboardData.totalSubjects > 0 
								? `Managing ${dashboardData.totalSubjects} subject${dashboardData.totalSubjects !== 1 ? 's' : ''}`
								: 'No subjects configured yet'
							}
						</p>
					</div>
					<div className="analytics-card">
						<h4>👥 Student Engagement</h4>
						<p>
							{dashboardData.totalStudents > 0 
								? `${dashboardData.studentsPresent} out of ${dashboardData.totalStudents} students attended today`
								: 'No students registered yet'
							}
						</p>
					</div>
					<div className="analytics-card">
						<h4>🎯 Class Status</h4>
						<p>
							{dashboardData.todaysClasses > 0 
								? `${dashboardData.todaysClasses} class${dashboardData.todaysClasses !== 1 ? 'es' : ''} conducted today`
								: 'No classes conducted today'
							}
						</p>
					</div>
				</div>
			</div>
			{/* Recent Activity */}
			<div className="recent-activity">
				<h3>📋 Recent Activity</h3>
				<div className="activity-list">
					<div className="activity-item">
						<div className="activity-icon">📝</div>
						<div className="activity-content">
							<h4>Attendance Recorded</h4>
							<p>Mathematics class - Section A</p>
							<span className="activity-time">2 hours ago</span>
						</div>
					</div>
					<div className="activity-item">
						<div className="activity-icon">👥</div>
						<div className="activity-content">
							<h4>New Student Added</h4>
							<p>John Doe enrolled in Section B</p>
							<span className="activity-time">5 hours ago</span>
						</div>
					</div>
					<div className="activity-item">
						<div className="activity-icon">📚</div>
						<div className="activity-content">
							<h4>Subject Updated</h4>
							<p>Science curriculum updated</p>
							<span className="activity-time">1 day ago</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default DashboardTeacher;
