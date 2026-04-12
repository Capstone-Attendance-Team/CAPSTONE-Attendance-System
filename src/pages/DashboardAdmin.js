import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../shared/UserContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faChartBar, faEnvelope, faUsers, faPhone, faBook, faComments, faSignOutAlt, faUser, faFileAlt, faPaperPlane, faInbox, faRefresh, faDownload, faX } from '@fortawesome/free-solid-svg-icons';
import NotificationIcon from '../shared/components/NotificationIcon';
import NotificationDropdown from '../shared/components/NotificationDropdown';
import InboxIcon from '../shared/components/InboxIcon';
import '../styles/DashboardAdmin.css';
import { useNotifications } from '../shared/hooks/useNotifications';
import ManageStudent from '../features/students/pages/ManageStudent';
import ManageSubjectSection from '../features/students/pages/ManageSubjectSection';
import { fetchSubjectSections } from '../features/students/pages/subjectSectionApi';
import { fetchStudents } from '../api/studentApi';
import { fetchInbox, deleteMessage, sendAdminMessageToMany } from '../api/messageApi';
import { fetchSentMessagesWithRole } from '../api/fetchSentMessagesWithRole';
import { deleteUser as apiDeleteUser } from '../api/userApi';
import { fetchTodayAttendanceSummaryAll, fetchAttendanceBySection } from '../api/attendanceApi';
import axios from 'axios';

// Helper to fetch attendance by month
async function fetchAttendanceByMonth(month) {
  if (!month) return [];
  // month format: YYYY-MM
  const url = `${process.env.REACT_APP_API_URL}/api/attendance/sections?month=${month}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return await res.json();
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


function DashboardAdmin() {
  // Month selection for attendance reports
  const [reportMonth, setReportMonth] = useState("");
  // Section attendance for month
  useEffect(() => {
    if (!reportMonth) return;
    fetchAttendanceByMonth(reportMonth).then(data => {
      setSectionAttendance(Array.isArray(data) ? data : []);
    }).catch(() => setSectionAttendance([]));
  }, [reportMonth]);
  const [adminMessageFile, setAdminMessageFile] = useState(null);
  const { setUser } = useUser();
  const [inboxView, setInboxView] = useState('received');
  // Hamburger menu state for sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Hover states for icons
  const [hoveredIcon, setHoveredIcon] = useState(null);
  // Announcements state (persisted in localStorage)
  const [announcements, setAnnouncements] = useState([]);
    useEffect(() => {
  axios.get(`${process.env.REACT_APP_API_URL}/api/announcements`)
    .then(res => setAnnouncements(res.data))
    .catch(() => setAnnouncements([]));
}, []);
  // Show/hide send message form
  const [showSendMessage, setShowSendMessage] = useState(false);
  // For specific user messaging
  const [adminMessageRecipientType, setAdminMessageRecipientType] = useState('group'); // 'group' or 'specific'
  const [adminMessageSpecificUsers, setAdminMessageSpecificUsers] = useState([]);
  const [adminMessageUserSearch, setAdminMessageUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  // User search state
  const [userSearch, setUserSearch] = useState("");

  // Admin inbox state (must be before any useEffect that uses it)
    const [adminInbox, setAdminInbox] = useState(() => {
      // Load sent messages from localStorage on mount
      try {
        const local = localStorage.getItem('adminSentMessages');
        return local ? JSON.parse(local) : [];
      } catch {
        return [];
      }
    });
  const [adminInboxLoading, setAdminInboxLoading] = useState(false);
  const [adminInboxError, setAdminInboxError] = useState(null);

  // Map of senderId to senderName
  const [senderNames, setSenderNames] = useState({});
  // Map of recipientId to recipientName (for sent messages)
  const [recipientNames, setRecipientNames] = useState({});

  // When adminInbox changes, fetch sender and recipient names if missing
  useEffect(() => {
    // Sender names
    const missingSenders = adminInbox.filter(msg => msg.sender && msg.sender.id && !senderNames[msg.sender.id]);
    if (missingSenders.length > 0) {
      Promise.all(missingSenders.map(msg => fetchUserName(msg.sender.id))).then(names => {
        const updates = {};
        missingSenders.forEach((msg, i) => { updates[msg.sender.id] = names[i]; });
        setSenderNames(prev => ({ ...prev, ...updates }));
      });
    }
    // Recipient names (for sent messages)
    const missingRecipients = adminInbox.filter(msg => msg.recipient && msg.recipient.id && !recipientNames[msg.recipient.id]);
    if (missingRecipients.length > 0) {
      Promise.all(missingRecipients.map(msg => fetchUserName(msg.recipient.id))).then(names => {
        const updates = {};
        missingRecipients.forEach((msg, i) => { updates[msg.recipient.id] = names[i]; });
        setRecipientNames(prev => ({ ...prev, ...updates }));
      });
    }
  }, [adminInbox]);
  // Admin message compose state
  const [adminMessageRecipient, setAdminMessageRecipient] = useState("");
  const [adminMessageContent, setAdminMessageContent] = useState("");
  const [adminMessageSending, setAdminMessageSending] = useState(false);
  const [adminMessageError, setAdminMessageError] = useState("");
  const [adminMessageSuccess, setAdminMessageSuccess] = useState("");

  // Announcement title state
  const [adminMessageTitle, setAdminMessageTitle] = useState("");

  // Utility function to remove numbers
// Only letters handler
const handleLettersOnlyChange = (e) => {
  const { name, value } = e.target;
  // Keep only letters and spaces
  const sanitizedValue = value.replace(/[^a-zA-Z\s]/g, '');
  setAddUserForm(prev => ({ ...prev, [name]: sanitizedValue }));
};


  // Handler for sending admin message (to be implemented)
  const handleSendAdminMessage = async (e) => {
  e.preventDefault();
  setAdminMessageError("");
  setAdminMessageSuccess("");
  setAdminMessageSending(true);
  try {
    let currentUser = null;
    try {
      currentUser = JSON.parse(localStorage.getItem('currentUser'));
    } catch (err) {
      currentUser = null;
    }
    if (!currentUser || !currentUser._id) {
      setAdminMessageError('No admin user found. Please log out and log in again.');
      setAdminMessageSending(false);
      return;
    }
    let fileUrl = null;
    if (adminMessageFile) {
      // Convert file to base64
      fileUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(adminMessageFile);
      });
    }
    if (adminMessageRecipientType === 'specific') {
      // Inbox message to specific users
      if (!adminMessageSpecificUsers.length || !adminMessageContent.trim()) {
        setAdminMessageError("Please select at least one user and enter a message.");
        setAdminMessageSending(false);
        return;
      }
      
      let failed = 0;
      for (const userId of adminMessageSpecificUsers) {
        try {
          await sendAdminMessageToMany({
            senderId: currentUser._id,
            senderRole: 'admin',
            recipientUserId: userId,
            content: adminMessageContent,
            fileUrl
          });
          // Add to local inbox and persist in localStorage
          const sentMsg = {
            _id: `sent-${Date.now()}-${userId}`,
            sender: { id: currentUser._id, name: currentUser.fullName || 'Admin' },
            recipient: { id: userId },
            content: adminMessageContent,
            createdAt: new Date().toISOString(),
            isRead: false,
            fromSelf: true,
            fileUrl // <-- attach file here
          };
          setAdminInbox(prev => [sentMsg, ...prev]);
          try {
            const local = localStorage.getItem('adminSentMessages');
            const arr = local ? JSON.parse(local) : [];
            localStorage.setItem('adminSentMessages', JSON.stringify([sentMsg, ...arr]));
          } catch {}
        } catch (err) {
          failed++;
        }
      }
      if (failed > 0) {
        setAdminMessageError(`Failed to send to ${failed} user(s).`);
      } else {
        setAdminMessageSuccess("Message sent to selected user(s).");
        setAdminMessageContent("");
        setAdminMessageSpecificUsers([]);
        setAdminMessageFile(null); // clear file after sending
      }
    } else {
      // Announcement to group(s)
      if (!adminMessageRecipient || !adminMessageTitle.trim() || !adminMessageContent.trim()) {
        setAdminMessageError("Please select audience, enter a title, and a message.");
        setAdminMessageSending(false);
        return;
      }
  await axios.post(`${process.env.REACT_APP_API_URL}/api/announcements`, {
  title: adminMessageTitle,
  content: adminMessageContent,
  audience: adminMessageRecipient,
  postedBy: currentUser.fullName || 'Admin',
  fileUrl
});
// Fetch updated announcements from backend
const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/announcements`);
setAnnouncements(res.data);
      let recipientGroups = [];
      if (adminMessageRecipient === 'both') recipientGroups = ['teachers', 'parents'];
      else recipientGroups = [adminMessageRecipient];
      let allResults = [];
      for (const group of recipientGroups) {
        const results = await sendAdminMessageToMany({
          senderId: currentUser._id,
          senderRole: 'admin',
          recipientGroup: group,
          content: adminMessageContent,
          subject: adminMessageTitle,
          fileUrl
        });
        allResults = allResults.concat(results);
      }
      
      const sentMsg = {
        _id: `local-${Date.now()}`,
        sender: { id: currentUser._id, name: currentUser.fullName || 'Admin' },
        recipientGroup: adminMessageRecipient,
        content: adminMessageContent,
        subject: adminMessageTitle,
        createdAt: new Date().toISOString(),
        isRead: false,
        fromSelf: true,
        fileUrl // <-- attach file here
      };
      setAdminInbox(prev => [sentMsg, ...prev]);
      try {
        const local = localStorage.getItem('adminSentMessages');
        const arr = local ? JSON.parse(local) : [];
        localStorage.setItem('adminSentMessages', JSON.stringify([sentMsg, ...arr]));
      } catch {}
      const failed = allResults.filter(r => r.error);
      if (failed.length > 0) {
        setAdminMessageError(`Failed to send to ${failed.length} user(s).`);
      } else {
        setAdminMessageSuccess("Announcement sent to selected audience.");
        setAdminMessageContent("");
        setAdminMessageTitle("");
        setAdminMessageRecipient("");
        setAdminMessageFile(null); // clear file after sending
      }
    }
  } catch (err) {
    setAdminMessageError(err.message || 'Failed to send message.');
  } finally {
    setAdminMessageSending(false);
  }
};
  // Section navigation
  const [activeSection, setActiveSection] = useState('overview');

  // Notifications
  const notifications = useNotifications({ userRole: 'admin' });

  // User counts for dashboard overview
  const [userCounts, setUserCounts] = useState({ teacher: 0, parent: 0, student: 0 });

  // Attendance summary for today (whole school)
  const [attendanceData, setAttendanceData] = useState({ present: 0,late: 0, absent: 0 });

  // Add user modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserRole, setAddUserRole] = useState('teacher');
  const [addUserForm, setAddUserForm] = useState({
  firstName: '',
  lastName: '',
  middleName: '',
      email: '',
      contact: '',
      idNumber: '',
      assignedSections: [],
      assignedSubjects: [],
      sectionToAdd: '',
      subjectToAdd: '',
      linkedStudent: [],
      studentToAdd: '',
      studentSearch: '',
      username: '',
      password: '',
      confirmPassword: '',
      relationship: ''
  });
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserError, setAddUserError] = useState('');

  // Subject/section list
  const [subjectSectionList, setSubjectSectionList] = useState([]);
  // Section attendance summary for report
  const [sectionAttendance, setSectionAttendance] = useState([]);
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  // Student list for parent linking
  const [studentList, setStudentList] = useState([]);

  // User list
  const [userList, setUserList] = useState([]);

  // Profile modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUser, setProfileUser] = useState(null);

  // Navigation
  const navigate = useNavigate();

  // Handler skeletons (implement logic as needed)
  const handleOpenAddUser = (role) => {
    setAddUserRole(role);
    setShowAddUserModal(true);
  };
  const handleCloseAddUser = () => {
    setShowAddUserModal(false);
    setAddUserError('');
    setAddUserForm({
      fullName: '',
      email: '',
      contact: '',
      idNumber: '',
      assignedSections: [],
      assignedSubjects: [],
      sectionToAdd: '',
      subjectToAdd: '',
      linkedStudent: [],
      studentToAdd: '',
      studentSearch: '',
      username: '',
      password: '',
      confirmPassword: ''
    });
  };
  const handleAddUserFormChange = (e) => {
    const { name, value } = e.target;
    setAddUserForm(prev => ({ ...prev, [name]: value }));
  };
  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    setAddUserError("");
    // Username should not contain numbers for teacher or parent
    if ((addUserRole === 'teacher' || addUserRole === 'parent') && /\d/.test(addUserForm.username)) {
      setAddUserError('Username should not contain numbers for teachers or parents.');
      return;
    }
    // ID Number should not contain letters for teacher
    if (addUserRole === 'teacher' && addUserForm.idNumber && /[a-zA-Z]/.test(addUserForm.idNumber)) {
      setAddUserError('ID Number should not contain letters for teachers.');
      return;
    }
    // Contact Number should not contain letters for teacher or parent
    if ((addUserRole === 'teacher' || addUserRole === 'parent') && addUserForm.contact && /[a-zA-Z]/.test(addUserForm.contact)) {
      setAddUserError('Contact Number should not contain letters.');
      return;
    }
    setAddUserLoading(true);
    try {
      // Basic validation
      if (!addUserForm.firstName || !addUserForm.lastName || !addUserForm.middleName) {
        setAddUserError('First name, last name, and middle name are required. If no middle name, select "N/A".');
        setAddUserLoading(false);
        return;
      }
      if (addUserRole === 'teacher') {
        if (!addUserForm.username || !addUserForm.password || !addUserForm.confirmPassword) {
          setAddUserError('Username, password, and confirm password are required.');
          setAddUserLoading(false);
          return;
        }
        if (addUserForm.password !== addUserForm.confirmPassword) {
          setAddUserError('Passwords do not match.');
          setAddUserLoading(false);
          return;
        }
      }
      if (addUserRole === 'parent') {
        if (!addUserForm.linkedStudent || addUserForm.linkedStudent.length === 0) {
          setAddUserError('Please select at least one linked student for the parent.');
          setAddUserLoading(false);
          return;
        }
      }
      // Build payload
      let payload = {
        firstName: addUserForm.firstName,
        lastName: addUserForm.lastName,
        middleName: addUserForm.middleName,
        email: addUserForm.email,
        contact: addUserForm.contact,
        type: addUserRole,
      };
      if (addUserRole === 'teacher') {
        // Pair up assignedSections and assignedSubjects by index
        let assignedSections = [];
        for (let i = 0; i < Math.max(addUserForm.assignedSections.length, addUserForm.assignedSubjects.length); i++) {
          assignedSections.push({
            sectionName: addUserForm.assignedSections[i] || '',
            subjectName: addUserForm.assignedSubjects[i] || ''
          });
        }
        payload = {
          ...payload,
          username: addUserForm.username,
          password: addUserForm.password,
          idNumber: addUserForm.idNumber,
          assignedSections
        };
      } else if (addUserRole === 'parent') {
        payload = {
          ...payload,
          username: addUserForm.username,
          password: addUserForm.password,
          linkedStudent: addUserForm.linkedStudent,
          relationship: addUserForm.relationship
        };
      }
      // Send to backend
  const res = await fetch(`${process.env.REACT_APP_API_URL}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setAddUserError(data.message || 'Failed to add user.');
        setAddUserLoading(false);
        return;
      }
      // Success
      setShowAddUserModal(false);
      setAddUserForm({
        fullName: '',
        email: '',
        contact: '',
        idNumber: '',
        assignedSections: [],
        assignedSubjects: [],
        sectionToAdd: '',
        subjectToAdd: '',
        linkedStudent: [],
        studentToAdd: '',
        studentSearch: '',
        username: '',
        password: '',
        confirmPassword: ''
      });
      setAddUserLoading(false);
      // Refresh both userList and studentList to ensure linked students are up-to-date
      await fetchUsers();
      fetchStudents().then(data => {
        let list = Array.isArray(data) ? data : (data.students || data.list || []);
        setStudentList(list);
      });
      alert(data.message || 'User added successfully.');
    } catch (err) {
      setAddUserError(err.message || 'Failed to add user.');
      setAddUserLoading(false);
    }
  };
  const handleShowProfile = (user) => {
  console.log('[DEBUG] Opening profile modal for user:', user);
  console.log('[DEBUG] Current studentList:', studentList);
  // Normalize linkedStudent for parent users
  let normalizedUser = { ...user };
  if (user.type === 'parent') {
    let linked = user.linkedStudent;
    if (!Array.isArray(linked)) {
      if (typeof linked === 'string' && linked) linked = [linked];
      else if (linked == null) linked = [];
      else linked = Array.from(linked);
    }
    // Convert all IDs to string
    normalizedUser.linkedStudent = linked.map(id => id && id.toString());
    console.log('[DEBUG] Normalized linkedStudent:', normalizedUser.linkedStudent);
  }
  setProfileUser(normalizedUser);
  setShowProfileModal(true);
  };
  const handleCloseProfile = () => {
    setShowProfileModal(false);
    setProfileUser(null);
  };
  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user '${username || userId}'? This action cannot be undone.`)) return;
    try {
      await apiDeleteUser(userId);
      setUserList(prev => prev.filter(u => u._id !== userId));
      alert('User deleted successfully.');
      fetchUsers(); // Refresh user list from backend
    } catch (err) {
      alert('Failed to delete user: ' + (err.message || 'Unknown error'));
    }
  };
  // Fetch all users and students, update userList and userCounts
  const fetchUsers = async () => {
    try {
      // Fetch teachers and parents from user API
  const userRes = await fetch(`${process.env.REACT_APP_API_URL}/api/user/list`);
      if (!userRes.ok) throw new Error('Failed to fetch users');
      const userData = await userRes.json();
      const users = userData.users || [];
      setUserList(users);
      // Count teachers and parents
      const counts = { teacher: 0, parent: 0, student: 0 };
      users.forEach(u => {
        if (u.type === 'teacher') counts.teacher++;
        else if (u.type === 'parent') counts.parent++;
      });
      // Fetch students from student API
  const studentRes = await fetch(`${process.env.REACT_APP_API_URL}/api/students/list`);
      if (studentRes.ok) {
        const studentData = await studentRes.json();
        // studentData can be array or {students: []}
        let students = Array.isArray(studentData) ? studentData : (studentData.students || []);
        counts.student = students.length;
      }
      setUserCounts(counts);
    } catch (err) {
      setUserList([]);
      setUserCounts({ teacher: 0, parent: 0, student: 0 });
      console.error('Failed to fetch users or students:', err);
    }
  };
  // ...existing code...
  const handleLogout = () => {
    setUser(null); // Clear user context and storage
    navigate('/login');
  };

  // Fetch admin inbox messages (received + sent)
  const fetchAdminInbox = async () => {
    setAdminInboxLoading(true);
    setAdminInboxError(null);
    try {
      // Get current admin user from localStorage
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      if (!currentUser || !currentUser._id) throw new Error('No admin user found');
      // Fetch received and sent messages (with role=admin)
      const [received, sent] = await Promise.all([
        fetchInbox(currentUser._id, 'admin'),
        fetchSentMessagesWithRole(currentUser._id, 'admin')
      ]);
      // Mark sent messages with fromSelf: true for UI
      const sentMarked = sent.map(msg => ({ ...msg, fromSelf: true }));
      // Merge local sent messages from localStorage
      let localSent = [];
      try {
        const local = localStorage.getItem('adminSentMessages');
        localSent = local ? JSON.parse(local) : [];
      } catch {}
      // Avoid duplicates by _id
      const all = [...localSent, ...received, ...sentMarked].filter((msg, idx, arr) =>
        arr.findIndex(m => m._id === msg._id) === idx
      ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAdminInbox(all);
    } catch (err) {
      setAdminInboxError(err.message);
      setAdminInbox([]);
    } finally {
      setAdminInboxLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminInbox();
    fetchUsers();
    // Fetch subject/section list for dropdowns
    fetchSubjectSections().then(data => {
      let list = Array.isArray(data) ? data : (data.list || data.subjectSections || []);
      setSubjectSectionList(list);
    }).catch(() => setSubjectSectionList([]));
    // Fetch students for parent linking
    fetchStudents().then(data => {
      let list = Array.isArray(data) ? data : (data.students || data.list || []);
      setStudentList(list);
    }).catch(() => setStudentList([]));
    // Fetch today's attendance summary for the whole school
    fetchTodayAttendanceSummaryAll().then(data => {
      setAttendanceData(data);
    }).catch(() => {
  setAttendanceData({ present: 0,late: 0, absent: 0 });
    });
    // Fetch section attendance for reports (default: today)
    fetchAttendanceBySection(reportDate).then(data => {
      setSectionAttendance(Array.isArray(data) ? data : []);
    }).catch(() => {
      setSectionAttendance([]);
    });
  }, []);

  // Update section attendance when reportDate changes
  useEffect(() => {
    fetchAttendanceBySection(reportDate).then(data => {
      setSectionAttendance(Array.isArray(data) ? data : []);
    }).catch(() => {
      setSectionAttendance([]);
    });
  }, [reportDate]);

  // Delete message handler
  // Delete message handler for admin inbox (localStorage or backend)
  const handleDeleteAdminMessage = async (id) => {
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
      setAdminInbox(msgs => msgs.filter(m => m._id !== id));
    } else {
      // Backend message: delete via API
      try {
        await deleteMessage(id);
        setAdminInbox(msgs => msgs.filter(m => m._id !== id));
      } catch (err) {
        alert('Failed to delete message: ' + err.message);
      }
    }
  };
    return (
      <div className="admin-dashboard-container">
        {/* Sidebar */}
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
            <ul style={{ color: '#fff' }}>
              <li 
                className={activeSection === 'overview' ? 'active' : ''}
                onClick={() => { setActiveSection('overview'); setSidebarOpen(false); }}
                onMouseEnter={() => setHoveredIcon('overview')}
                onMouseLeave={() => setHoveredIcon(null)}
                style={{ background: activeSection === 'overview' ? '#fff' : 'transparent', color: activeSection === 'overview' ? '#010662' : '#fff', fontWeight: activeSection === 'overview' ? 700 : 500, borderRadius: 8, margin: '10px 12px', padding: '12px 18px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <FontAwesomeIcon icon={faChartBar} style={{fontSize: '18px', color: (activeSection === 'overview' || hoveredIcon === 'overview') ? '#f8bb08' : 'inherit', transition: 'color 0.2s'}} />
                Admin Dashboard
              </li>
              <li
                className={activeSection === 'inbox' ? 'active' : ''}
                onClick={() => { setActiveSection('inbox'); setSidebarOpen(false); }}
                onMouseEnter={() => setHoveredIcon('inbox-menu')}
                onMouseLeave={() => setHoveredIcon(null)}
                style={{ background: activeSection === 'inbox' ? '#fff' : 'transparent', color: activeSection === 'inbox' ? '#010662' : '#fff', fontWeight: activeSection === 'inbox' ? 700 : 500, borderRadius: 8, margin: '10px 12px', padding: '12px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <FontAwesomeIcon icon={faEnvelope} style={{fontSize: '18px', color: (activeSection === 'inbox' || hoveredIcon === 'inbox-menu') ? '#f8bb08' : 'inherit', transition: 'color 0.2s'}} />
                Inbox
              </li>
              <li 
                className={activeSection === 'users' ? 'active' : ''}
                onClick={() => { setActiveSection('users'); setSidebarOpen(false); }}
                onMouseEnter={() => setHoveredIcon('users')}
                onMouseLeave={() => setHoveredIcon(null)}
                style={{ background: activeSection === 'users' ? '#fff' : 'transparent', color: activeSection === 'users' ? '#010662' : '#fff', fontWeight: activeSection === 'users' ? 700 : 500, borderRadius: 8, margin: '10px 12px', padding: '12px 18px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <FontAwesomeIcon icon={faUsers} style={{fontSize: '18px', color: (activeSection === 'users' || hoveredIcon === 'users') ? '#f8bb08' : 'inherit', transition: 'color 0.2s'}} />
                User Management
              </li>
              <li 
                className={activeSection === 'students' ? 'active' : ''}
                onClick={() => { setActiveSection('students'); setSidebarOpen(false); }}
                onMouseEnter={() => setHoveredIcon('students')}
                onMouseLeave={() => setHoveredIcon(null)}
                style={{ background: activeSection === 'students' ? '#fff' : 'transparent', color: activeSection === 'students' ? '#010662' : '#fff', fontWeight: activeSection === 'students' ? 700 : 500, borderRadius: 8, margin: '10px 12px', padding: '12px 18px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <FontAwesomeIcon icon={faPhone} style={{fontSize: '18px', color: (activeSection === 'students' || hoveredIcon === 'students') ? '#f8bb08' : 'inherit', transition: 'color 0.2s'}} />
                Manage Student
              </li>
              <li 
                className={activeSection === 'subjectSection' ? 'active' : ''}
                onClick={() => { setActiveSection('subjectSection'); setSidebarOpen(false); }}
                onMouseEnter={() => setHoveredIcon('subjectSection')}
                onMouseLeave={() => setHoveredIcon(null)}
                style={{ background: activeSection === 'subjectSection' ? '#fff' : 'transparent', color: activeSection === 'subjectSection' ? '#010662' : '#fff', fontWeight: activeSection === 'subjectSection' ? 700 : 500, borderRadius: 8, margin: '10px 12px', padding: '12px 18px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <FontAwesomeIcon icon={faBook} style={{fontSize: '18px', color: (activeSection === 'subjectSection' || hoveredIcon === 'subjectSection') ? '#f8bb08' : 'inherit', transition: 'color 0.2s'}} />
                Manage Subject/Section
              </li>
              <li 
                className={activeSection === 'announcements' ? 'active' : ''}
                onClick={() => { setActiveSection('announcements'); setSidebarOpen(false); }}
                onMouseEnter={() => setHoveredIcon('announcements')}
                onMouseLeave={() => setHoveredIcon(null)}
                style={{ background: activeSection === 'announcements' ? '#fff' : 'transparent', color: activeSection === 'announcements' ? '#010662' : '#fff', fontWeight: activeSection === 'announcements' ? 700 : 500, borderRadius: 8, margin: '10px 12px', padding: '12px 18px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <FontAwesomeIcon icon={faComments} style={{fontSize: '18px', color: (activeSection === 'announcements' || hoveredIcon === 'announcements') ? '#f8bb08' : 'inherit', transition: 'color 0.2s'}} />
                Announcements
              </li>
              <li 
                className={activeSection === 'reports' ? 'active' : ''}
                onClick={() => { setActiveSection('reports'); setSidebarOpen(false); }}
                onMouseEnter={() => setHoveredIcon('reports')}
                onMouseLeave={() => setHoveredIcon(null)}
                style={{ background: activeSection === 'reports' ? '#fff' : 'transparent', color: activeSection === 'reports' ? '#010662' : '#fff', fontWeight: activeSection === 'reports' ? 700 : 500, borderRadius: 8, margin: '10px 12px', padding: '12px 18px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <FontAwesomeIcon icon={faChartBar} style={{fontSize: '18px', color: (activeSection === 'reports' || hoveredIcon === 'reports') ? '#f8bb08' : 'inherit', transition: 'color 0.2s'}} />
                Reports
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

        {/* Main Content */}
        <div className="admin-main-content" style={{ transition: 'margin-left 0.3s' }}>
          <header className="admin-header" style={{ background: 'linear-gradient(90deg, #010162 0%, #1a1a8a 100%)', color: '#fff', borderBottom: '2px solid #010162', boxShadow: '0 2px 8px rgba(1,1,98,0.15)', padding: 0, position: 'sticky', top: 0, zIndex: 100 }}>
            <div className="admin-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '25px 24px', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
              {/* Hamburger Button + Logo and School Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                <button
                  style={{
                    background: 'transparent',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '24px',
                    flexShrink: 0
                  }}
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open sidebar"
                >
                  <FontAwesomeIcon icon={faBars} style={{color: '#fff', fontSize: '20px'}} />
                </button>
                
                {/* Logo and School Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveSection('dashboard')}>
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
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>Admin Dashboard</span>
                  </div>
                </div>
              </div>

              <div className="admin-user-info" style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <NotificationIcon 
                    unreadCount={notifications.unreadCount}
                    onClick={notifications.toggleNotifications}
                    color="#fff"
                  />
                  {notifications.unreadCount > 0 && (
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
                      {notifications.unreadCount > 99 ? '99+' : notifications.unreadCount}
                    </span>
                  )}
                </div>
                <InboxIcon onClick={() => setActiveSection('inbox')} color="#fff" />
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
                  <span className="username" style={{ color: '#fff', fontWeight: 600 }}>Administrator</span>
                </div>
                
              </div>
            </div>
          </header>

          {/* Notification Dropdown */}
          <NotificationDropdown
            notifications={notifications.notifications}
            isOpen={notifications.isOpen}
            onClose={notifications.closeNotifications}
            onMarkAsRead={notifications.markAsRead}
            onMarkAllAsRead={notifications.markAllAsRead}
            onDelete={notifications.deleteNotification}
          />

          {/* Content */}
          <div className="admin-content">
            {/* Admin Inbox Section */}
            {activeSection === 'inbox' && (
              <div className="admin-inbox-section redesigned-inbox" style={{maxWidth: 700, margin: '0 auto', padding: 32}}>
                <h2 style={{fontWeight: 700, fontSize: 28, color: '#2d3748', marginBottom: 18, display:'flex',alignItems:'center',gap:8}}>
                  <FontAwesomeIcon icon={faInbox} style={{fontSize: '28px', color: '#2d3748'}} />
                  Admin Inbox
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
                  <button onClick={()=>setShowSendMessage(v=>!v)} className="dashboard-btn primary">
                    {showSendMessage ? 'Close' : '+ New Message'}
                  </button>
                  <button
                    onClick={fetchAdminInbox}
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
                    <FontAwesomeIcon icon={faRefresh} style={{fontSize: '20px'}} />
                  </button>
                </div>
                {showSendMessage && (
                  <div className="inbox-compose-card">
                    <h3 style={{marginBottom:12}}>Send Message</h3>
                    <form onSubmit={handleSendAdminMessage} style={{display:'flex',flexDirection:'column',gap:12}}>
                      <div style={{display:'flex',gap:12,alignItems:'center'}}>
                        <label style={{fontWeight:500}}>To:</label>
                        <select value={adminMessageRecipientType} onChange={e => setAdminMessageRecipientType(e.target.value)} style={{padding:'6px 12px',borderRadius:6}} required>
                          <option value="group">Group</option>
                          <option value="specific">Specific Users</option>
                        </select>
                        {adminMessageRecipientType === 'group' && (
                          <select value={adminMessageRecipient} onChange={e => setAdminMessageRecipient(e.target.value)} style={{padding:'6px 12px',borderRadius:6}} required>
                            <option value="">Select group</option>
                            <option value="teachers">All Teachers</option>
                            <option value="parents">All Parents</option>
                            <option value="both">All Teachers & Parents</option>
                          </select>
                        )}
                        {adminMessageRecipientType === 'specific' && (
                          <div style={{minWidth:220, position:'relative'}}>
                            <input
                              type="text"
                              placeholder="Search users..."
                              value={adminMessageUserSearch}
                              onChange={e => {
                                setAdminMessageUserSearch(e.target.value);
                                setShowUserDropdown(true);
                              }}
                              onFocus={() => setShowUserDropdown(true)}
                              style={{padding:'6px 10px',borderRadius:5,border:'1px solid #ccc',marginBottom:6,width:'100%'}}
                            />
                            {showUserDropdown && (
                              <div style={{position:'absolute',zIndex:10,top:38,left:0,right:0,maxHeight:140,overflowY:'auto',border:'1px solid #eee',borderRadius:6,background:'#fff',boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
                                {userList.filter(u => (u.type === 'teacher' || u.type === 'parent') &&
                                  !adminMessageSpecificUsers.includes(u._id) && (
                                    !adminMessageUserSearch.trim() ||
                                    (u.fullName && u.fullName.toLowerCase().includes(adminMessageUserSearch.trim().toLowerCase())) ||
                                    (u.username && u.username.toLowerCase().includes(adminMessageUserSearch.trim().toLowerCase())) ||
                                    (u.email && u.email.toLowerCase().includes(adminMessageUserSearch.trim().toLowerCase()))
                                  )
                                ).slice(0,10).map(u => (
                                  <div
                                    key={u._id}
                                    style={{padding:'6px 10px',cursor:'pointer',fontSize:15}}
                                    onMouseDown={e => {
                                      e.preventDefault();
                                      setAdminMessageSpecificUsers(prev => [...prev, u._id]);
                                      setAdminMessageUserSearch("");
                                      setShowUserDropdown(false);
                                    }}
                                  >
                                    {u.fullName || u.username} <span style={{color:'#888',fontSize:13}}>({u.type})</span>
                                  </div>
                                ))}
                                {userList.filter(u => (u.type === 'teacher' || u.type === 'parent') &&
                                  !adminMessageSpecificUsers.includes(u._id) && (
                                    !adminMessageUserSearch.trim() ||
                                    (u.fullName && u.fullName.toLowerCase().includes(adminMessageUserSearch.trim().toLowerCase())) ||
                                    (u.username && u.username.toLowerCase().includes(adminMessageUserSearch.trim().toLowerCase())) ||
                                    (u.email && u.email.toLowerCase().includes(adminMessageUserSearch.trim().toLowerCase()))
                                  )
                                ).length === 0 && (
                                  <div style={{color:'#aaa',fontSize:14,padding:'6px 10px'}}>No users found.</div>
                                )}
                              </div>
                            )}
                            <div style={{marginTop:6,display:'flex',flexWrap:'wrap',gap:6}}>
                              {adminMessageSpecificUsers.map(id => {
                                const u = userList.find(u => u._id === id);
                                return u ? (
                                  <span key={id} style={{background:'#e3f2fd',borderRadius:12,padding:'2px 10px',fontSize:13,display:'inline-flex',alignItems:'center',gap:4}}>
                                    {u.fullName || u.username}
                                    <button type="button" style={{marginLeft:2,background:'none',border:'none',color:'#ff4757',cursor:'pointer',fontWeight:'bold'}} onClick={() => setAdminMessageSpecificUsers(prev => prev.filter(i => i !== id))}>×</button>
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                    
                      </div>
                      <textarea
                        value={adminMessageContent}
                        onChange={e => setAdminMessageContent(e.target.value)}
                        placeholder="Type your message here..."
                        rows={3}
                        style={{padding:'8px 12px',borderRadius:6,border:'1px solid #ccc',resize:'vertical'}}
                        required
                      />
                      <input
                         type="file"
                         accept="image/*,.pdf,.doc,.docx"
                          onChange={e => setAdminMessageFile(e.target.files[0])}
                          style={{marginTop:8}}
                       />
                      <div style={{display:'flex',gap:12,alignItems:'center'}}>
                        <button type="submit" className="dashboard-btn primary" disabled={adminMessageSending}>
                          {adminMessageSending ? 'Sending...' : 'Send'}
                        </button>
                        {adminMessageError && <span style={{color:'#e53e3e'}}>{adminMessageError}</span>}
                        {adminMessageSuccess && <span style={{color:'#38a169'}}>{adminMessageSuccess}</span>}
                      </div>
                    </form>
                  </div>
                )}
                {/* Refresh button moved above, removed from here */}
                <div style={{background: '#f7fafc', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: 24, marginTop: 24}}>
                  {adminInboxLoading ? (
                    <div style={{textAlign:'center',color:'#888'}}>Loading...</div>
                  ) : adminInboxError ? (
                    <div style={{textAlign:'center',color:'#e53e3e'}}>Error: {adminInboxError}</div>
                  ) : adminInbox.length === 0 ? (
                    <div style={{textAlign:'center',color:'#888'}}>No messages in your inbox.</div>
                  ) : (
                    <div style={{display:'flex',flexDirection:'column',gap:18}}>
                      {adminInbox
  .filter(msg => {
    const isSent = msg.fromSelf || (msg.sender && msg.sender.role === 'admin');
    return inboxView === 'sent' ? isSent : !isSent;
  })
  .map(msg => {
    const isSent = msg.fromSelf || (msg.sender && msg.sender.role === 'admin');
    const isExcuse = msg.type === 'excuse_letter';
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
          {isExcuse ? (
            <FontAwesomeIcon icon={faFileAlt} style={{fontSize: '20px', color: '#3182ce'}} />
          ) : isSent ? (
            <FontAwesomeIcon icon={faPaperPlane} style={{fontSize: '20px', color: '#3182ce'}} />
          ) : (
            <FontAwesomeIcon icon={faInbox} style={{fontSize: '20px', color: '#3182ce'}} />
          )}
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
              : (senderNames[msg.sender?.id] || msg.sender?.name || 'Unknown')}
          </span>
        </div>
        <div style={{fontSize:'1.08rem',color:'#333',marginBottom:10,whiteSpace:'pre-line'}}>
          {msg.content}
          {/* Show file attachment for any message */}
          {msg.fileUrl && (
            <div style={{marginTop:8}}>
              <a href={msg.fileUrl} download style={{color:'#3182ce',fontWeight:600,textDecoration:'underline',fontSize:15}}>
                <FontAwesomeIcon icon={faDownload} style={{display: 'inline-block', marginRight: '4px', verticalAlign: 'middle', fontSize: '14px'}} />
                Download Attachment
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
        </div>
      </div>
    );
  })
}
                    </div>
                  )}
                </div>
              </div>
            )}
          {/* Dashboard Overview: Total Users Card */}
          {activeSection === 'overview' && (
            <div className="dashboard-overview-section redesigned-overview">
              <h2 style={{fontWeight:700, fontSize:28, color:'#010662', marginBottom:24, display:'flex',alignItems:'center',gap:10}}>
                <FontAwesomeIcon icon={faChartBar} style={{fontSize: '28px', color: '#010662'}} />
                Admin Dashboard
              </h2>
              <div className="dashboard-overview-cards redesigned-cards">
                <div className="dashboard-card redesigned-card" style={{background:'#e3f2fd', border: '2px solid #010662'}}>
                  <div className="dashboard-card-icon" style={{fontSize:32, color:'#010662', marginBottom:8}}>
                    <FontAwesomeIcon icon={faUsers} style={{fontSize: '32px', color: '#010662'}} />
                  </div>
                  <div className="dashboard-card-title">Teachers</div>
                  <div className="dashboard-card-value" style={{color:'#2196F3'}}>{userCounts.teacher}</div>
                  <div className="dashboard-card-desc">Registered teachers</div>
                </div>
                <div className="dashboard-card redesigned-card" style={{background:'#e6fffa', border: '2px solid #010662'}}>
                  <div className="dashboard-card-icon" style={{fontSize:32, color:'#010662', marginBottom:8}}>
                    <FontAwesomeIcon icon={faUsers} style={{fontSize: '32px', color: '#010662'}} />
                  </div>
                  <div className="dashboard-card-title">Parents</div>
                  <div className="dashboard-card-value" style={{color:'#38b2ac'}}>{userCounts.parent}</div>
                  <div className="dashboard-card-desc">Registered parents</div>
                </div>
                <div className="dashboard-card redesigned-card" style={{background:'#fffbea', border: '2px solid #010662'}}>
                  <div className="dashboard-card-icon" style={{fontSize:32, color:'#010662', marginBottom:8}}>
                    <FontAwesomeIcon icon={faBook} style={{fontSize: '32px', color: '#010662'}} />
                  </div>
                  <div className="dashboard-card-title">Students</div>
                  <div className="dashboard-card-value" style={{color:'#f6ad55'}}>{userCounts.student}</div>
                  <div className="dashboard-card-desc">Registered students</div>
                </div>
                <div className="dashboard-card redesigned-card" style={{background:'#ffeaea', border: '2px solid #010662'}}>
                  <div className="dashboard-card-icon" style={{fontSize:32, color:'#010662', marginBottom:8}}>
                    <FontAwesomeIcon icon={faChartBar} style={{fontSize: '32px', color: '#010662'}} />
                  </div>
                  <div className="dashboard-card-title">Today's Attendance</div>
                  {/* Attendance Bar Graph */}
                  <div style={{ width: '100%', maxWidth: 320, margin: '0 auto', padding: '16px 0' }}>
                    {(() => {
                      //cahnges here
                      const present = attendanceData.present || 0;
                      
                      const absent = attendanceData.absent || 0;
                      const max = Math.max(present, absent, 1);
                      const barHeight = 80;
                      return (
                   <svg
                        width="100%"
                        height={barHeight + 40}
                        viewBox={`0 0 200 ${barHeight + 40}`}
                        style={{ display: 'block', margin: '0 auto' }}
                      >
                        {/* Present Bar */}
                        <rect
                          x="30"
                          y={barHeight - (present / max) * barHeight + 20}
                          width="60"
                          height={(present / max) * barHeight}
                          fill="#38b2ac"
                          rx="8"
                        />
                        <text
                          x="60"
                          y={barHeight + 35}
                          textAnchor="middle"
                          fontSize="15"
                          fill="#010662"
                        >
                          Present
                        </text>
                        <text
                          x="60"
                          y={barHeight - (present / max) * barHeight + 12}
                          textAnchor="middle"
                          fontSize="16"
                          fontWeight="bold"
                          fill="#222"
                        >
                          {present}
                        </text>
                        
                        {/* Absent Bar */}
                        <rect
                          x="130"
                          y={barHeight - (absent / max) * barHeight + 20}
                          width="60"
                          height={(absent / max) * barHeight}
                          fill="#ff4757"
                          rx="8"
                        />
                        <text
                          x="160"
                          y={barHeight + 35}
                          textAnchor="middle"
                          fontSize="15"
                          fill="#010662"
                        >
                          Absent
                        </text>
                        <text
                          x="160"
                          y={barHeight - (absent / max) * barHeight + 12}
                          textAnchor="middle"
                          fontSize="16"
                          fontWeight="bold"
                          fill="#222"
                        >
                          {absent}
                        </text>
                
                      </svg>

                      );
                    })()}
                  </div>
                  <div className="dashboard-card-desc">Attendance summary for today</div>
                </div>
              </div>
            </div>
          )}
          {/* Reports Section */}
          {activeSection === 'reports' && (
            <div className="dashboard-reports-section">
              <h2>Reports</h2>
              <div style={{marginBottom: 18, display: 'flex', alignItems: 'center', gap: 16}}>
                <label htmlFor="report-month" style={{fontWeight: 600}}>Select Month:</label>
                <input
                  id="report-month"
                  type="month"
                  value={reportMonth}
                  onChange={e => setReportMonth(e.target.value)}
                  style={{padding: '6px 12px', borderRadius: 6, border: '1px solid #b6d0f7', fontWeight: 500}}
                  max={new Date().toISOString().slice(0, 7)}
                />
              </div>
              <button
                className="dashboard-btn primary"
                style={{marginBottom: 12}}
                onClick={() => {
                  console.log('Section Attendance Data:', sectionAttendance);
                  if (!sectionAttendance || sectionAttendance.length === 0) return;
                  // Prepare worksheet data
                  const wsData = [
                    ['Section', 'Present','Late','Absent'],
                    ...sectionAttendance.map(sec => [
                      sec.section || sec.sectionName || '',
                      sec.present || 0,
                      sec.late || 0,
                      sec.absent || 0
                    ])
                  ];
                  const ws = XLSX.utils.aoa_to_sheet(wsData);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
                  XLSX.writeFile(wb, `section-attendance-${reportMonth || 'month'}.xlsx`);
                }}
              >Export to Excel</button>
              <div className="reports-panel">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th>Present</th>
                      <th>Late</th>
                      <th>Absent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionAttendance.length === 0 ? (
                      <tr><td colSpan="3" style={{textAlign:'center',color:'#888'}}>No attendance data for this date.</td></tr>
                    ) : (
                      sectionAttendance.map((sec, idx) => (
                        <tr key={sec.section || idx}>
                          <td>{sec.section || sec.sectionName || `Section ${idx+1}`}</td>
                          <td>{sec.present || 0}</td>
                          <td>{sec.late || 0}</td>                 
                          <td>{sec.absent || 0}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* User Management Section */}
          {activeSection === 'users' && (
            <div className="dashboard-users-section redesigned-users-section">
              <div className="dashboard-section-header">
                <h2>System Users</h2>
                <div>
                  <button className="dashboard-btn primary" onClick={() => handleOpenAddUser('teacher')}>+ Add Teacher</button>
                  <button className="dashboard-btn primary" style={{ marginLeft: '8px' }} onClick={() => handleOpenAddUser('parent')}>+ Add Parent</button>
                </div>
              </div>
              {/* Add User Modal */}
              {showAddUserModal && (
                <div className="modal-overlay">
                  <div className="modal-content redesigned-modal-content">
                    <h2 className="modal-title">Add {addUserRole === 'teacher' ? 'Teacher' : 'Parent'}</h2>
                    <form onSubmit={handleAddUserSubmit} className="add-user-form redesigned-add-user-form">
                      {/* Row 1: Name fields */}
                      <div className="form-row">
                       <div className="form-group">
  <label>First Name<span style={{color:'red'}}>*</span></label>
  <input
    name="firstName"
    type="text"
    value={addUserForm.firstName}
    onChange={handleLettersOnlyChange}
    required
  />
</div>

<div className="form-group">
  <label>Last Name<span style={{color:'red'}}>*</span></label>
  <input
    name="lastName"
    type="text"
    value={addUserForm.lastName}
    onChange={handleLettersOnlyChange}
    required
  />
</div>
<div className="form-group">
<label>Middle Name<span style={{color:'red'}}>*</span></label>
  <select
    name="middleNameSelect"
    value={addUserForm.middleName === 'N/A' ? 'N/A' : addUserForm.middleName ? 'custom' : ''}
    onChange={e => {
      if (e.target.value === 'N/A') {
        setAddUserForm(prev => ({ ...prev, middleName: 'N/A' }));
      } else {
        setAddUserForm(prev => ({ ...prev, middleName: '' }));
      }
    }}
    required
  >
    <option value="">Enter Middle Name</option>
    <option value="N/A">N/A</option>
    <option value="custom">Custom</option>
  </select>

  <input
    name="middleName"
    type="text"
    value={addUserForm.middleName !== 'N/A' ? addUserForm.middleName : ''}
    onChange={e => {
      // Only letters allowed
      const sanitizedValue = e.target.value.replace(/[^a-zA-Z\s]/g, '');
      setAddUserForm(prev => ({ ...prev, middleName: sanitizedValue }));
    }}
    placeholder="Enter middle name or select N/A"
    disabled={addUserForm.middleName === 'N/A'}
    required={addUserForm.middleName !== 'N/A'}
  />
</div>

                      </div>
                      {/* Row 2: Contact fields */}
                      <div className="form-row">
                        <div className="form-group">
                          <label>Email Address<span style={{color:'red'}}>*</span></label>
                          <input name="email" type="email" value={addUserForm.email} onChange={handleAddUserFormChange} required />
                        </div>
                        <div className="form-group">
                            <label>Contact Number</label>
                            <input
                              name="contact"
                              type="text"
                              value={addUserForm.contact}
                              maxLength={11}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, ""); // remove non-numbers
                                handleAddUserFormChange({
                                  target: { name: "contact", value }
                                });
                              }}
                            />
                          </div>
                        {addUserRole !== 'parent' && (
                          <div className="form-group">
                        <label>ID Number</label>
                        <input
                          name="idNumber"
                          type="text"
                          value={addUserForm.idNumber}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, ""); // remove non-numbers
                            handleAddUserFormChange({
                              target: { name: "idNumber", value }
                            });
                          }}
                        />
                      </div>
                        )}
                      </div>
                      {/* Row 3: Account fields */}
                      <div className="form-row">
                        <div className="form-group">
                          <label>Username<span style={{color:'red'}}>*</span></label>
                          <input
                            name="username"
                            type="text"
                            value={addUserForm.username}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^a-zA-Z]/g, ""); // allow letters only
                              handleAddUserFormChange({
                                target: { name: "username", value }
                              });
                            }}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Password<span style={{color:'red'}}>*</span></label>
                          <input name="password" type="password" value={addUserForm.password} onChange={handleAddUserFormChange} required />
                        </div>
                        <div className="form-group">
                          <label>Confirm Password<span style={{color:'red'}}>*</span></label>
                          <input name="confirmPassword" type="password" value={addUserForm.confirmPassword} onChange={handleAddUserFormChange} required />
                        </div>
                      </div>
                      {addUserRole === 'teacher' && (
                        <>
                          <div className="form-row">
                            <div className="form-group">
                              <label>Assigned Section(s)</label>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <select name="sectionToAdd" value={addUserForm.sectionToAdd || ''} onChange={e => setAddUserForm(prev => ({ ...prev, sectionToAdd: e.target.value }))}>
                                  <option value="">Select section</option>
                                  {[...new Set(subjectSectionList.map(item => item.section))].map((section, idx) => (
                                    <option key={section + idx} value={section}>{section}</option>
                                  ))}
                                </select>
                                <button type="button" className="dashboard-btn" onClick={() => {
                                  if (addUserForm.sectionToAdd && !addUserForm.assignedSections?.includes(addUserForm.sectionToAdd)) {
                                    setAddUserForm(prev => ({
                                      ...prev,
                                      assignedSections: [...(prev.assignedSections || []), prev.sectionToAdd],
                                      sectionToAdd: ''
                                    }));
                                  }
                                }}>Add</button>
                              </div>
                              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {(addUserForm.assignedSections || []).map(section => (
                                  <span key={section} style={{ background: '#e3f2fd', borderRadius: 12, padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    {section}
                                    <button type="button" style={{ marginLeft: 4, background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setAddUserForm(prev => ({ ...prev, assignedSections: prev.assignedSections.filter(s => s !== section) }))}>×</button>
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="form-group">
                              <label>Assigned Subject(s)</label>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <select name="subjectToAdd" value={addUserForm.subjectToAdd || ''} onChange={e => setAddUserForm(prev => ({ ...prev, subjectToAdd: e.target.value }))}>
                                  <option value="">Select subject</option>
                                  {[...new Set(subjectSectionList.map(item => item.subject))].map((subject, idx) => (
                                    <option key={subject + idx} value={subject}>{subject}</option>
                                  ))}
                                </select>
                                <button type="button" className="dashboard-btn" onClick={() => {
                                  if (addUserForm.subjectToAdd && !addUserForm.assignedSubjects?.includes(addUserForm.subjectToAdd)) {
                                    setAddUserForm(prev => ({
                                      ...prev,
                                      assignedSubjects: [...(prev.assignedSubjects || []), prev.subjectToAdd],
                                      subjectToAdd: ''
                                    }));
                                  }
                                }}>Add</button>
                              </div>
                              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {(addUserForm.assignedSubjects || []).map(subject => (
                                  <span key={subject} style={{ background: '#e3f2fd', borderRadius: 12, padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    {subject}
                                    <button type="button" style={{ marginLeft: 4, background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setAddUserForm(prev => ({ ...prev, assignedSubjects: prev.assignedSubjects.filter(s => s !== subject) }))}>×</button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      {addUserRole === 'parent' && (
                        <></>
                      )}
                      {addUserRole === 'parent' && (
                        <div className="form-row">
                          <div className="form-group">
                            <label>Linked Student(s)</label>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                              <input
                                type="text"
                                placeholder="Search student name or ID..."
                                value={addUserForm.studentSearch || ''}
                                onChange={e => setAddUserForm(prev => ({ ...prev, studentSearch: e.target.value }))}
                                style={{ flex: 1, padding: '6px 10px', borderRadius: 5, border: '1px solid #ccc' }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <select name="studentToAdd" value={addUserForm.studentToAdd || ''} onChange={e => setAddUserForm(prev => ({ ...prev, studentToAdd: e.target.value }))}>
                                <option value="">Select student</option>
                                {studentList.length > 0 ? (
                                  studentList.filter(student =>
                                    (addUserForm.studentSearch || '').trim() === '' ||
                                    (student.fullName && student.fullName.toLowerCase().includes((addUserForm.studentSearch || '').toLowerCase())) ||
                                    (student.studentId && student.studentId.toLowerCase().includes((addUserForm.studentSearch || '').toLowerCase()))
                                  ).map(student => (
                                    <option key={student._id || student.studentId} value={student._id || student.studentId}>
                                      {student.fullName} ({student.studentId})
                                    </option>
                                  ))
                                ) : (
                                  <option disabled>No students found</option>
                                )}
                              </select>
                              <button type="button" className="dashboard-btn" onClick={() => {
                                if (addUserForm.studentToAdd) {
                                  setAddUserForm(prev => {
                                    const alreadyAdded = prev.linkedStudent || [];
                                    if (!alreadyAdded.includes(prev.studentToAdd)) {
                                      return {
                                        ...prev,
                                        linkedStudent: [...alreadyAdded, prev.studentToAdd],
                                        studentToAdd: ''
                                      };
                                    } else {
                                      return {
                                        ...prev,
                                        studentToAdd: ''
                                      };
                                    }
                                  });
                                }
                              }}>Add</button>
                            </div>
                            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {[...(addUserForm.linkedStudent || [])]
                                .filter((id, idx, arr) => arr.indexOf(id) === idx)
                                .map(studentId => {
                                  const student = studentList.find(s => (s._id || s.studentId) === studentId);
                                  return (
                                    <span key={studentId} style={{ background: '#e3f2fd', borderRadius: 12, padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                      {student ? `${student.fullName} (${student.studentId || student._id})` : studentId}
                                      <button type="button" style={{ marginLeft: 4, background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setAddUserForm(prev => ({ ...prev, linkedStudent: prev.linkedStudent.filter(s => s !== studentId) }))}>×</button>
                                    </span>
                                  );
                                })}
                            </div>
                          </div>
                        </div>
                      )}
                      {/* ...other parent fields... */}
                      <div className="form-actions">
                        <button type="submit" className="dashboard-btn primary" disabled={addUserLoading}>Add User</button>
                        <button type="button" className="dashboard-btn" onClick={handleCloseAddUser}>Cancel</button>
                      </div>
                      {addUserError && <div style={{ color: 'red', marginTop: 8 }}>{addUserError}</div>}
                    </form>
                  </div>
                </div>
              )}
              {/* User Search Bar */}
              <div className="dashboard-user-search-row">
                <input
                  type="text"
                  className="dashboard-user-search-input"
                  placeholder="Search users by name, username, or email..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
                <button
                  className="dashboard-btn"
                  type="button"
                  onClick={() => setUserSearch(userSearch.trim())}
                >Search</button>
                <button
                  className="dashboard-btn"
                  type="button"
                  onClick={() => setUserSearch("")}
                  style={{ background: '#eee', color: '#333' }}
                >Clear</button>
              </div>
              <div className="dashboard-user-list redesigned-user-list">
                {userList.filter(u => u.type === 'teacher' || u.type === 'parent')
                  .filter(u => {
                    if (!userSearch.trim()) return true;
                    const search = userSearch.trim().toLowerCase();
                    return (
                      (u.fullName && u.fullName.toLowerCase().includes(search)) ||
                      (u.username && u.username.toLowerCase().includes(search)) ||
                      (u.email && u.email.toLowerCase().includes(search))
                    );
                  }).length === 0 ? (
                  <div className="dashboard-user-empty">No teachers or parents found.</div>
                ) : (
                  userList.filter(u => u.type === 'teacher' || u.type === 'parent')
                    .filter(u => {
                      if (!userSearch.trim()) return true;
                      const search = userSearch.trim().toLowerCase();
                      return (
                        (u.fullName && u.fullName.toLowerCase().includes(search)) ||
                        (u.username && u.username.toLowerCase().includes(search)) ||
                        (u.email && u.email.toLowerCase().includes(search))
                      );
                    })
                    .map((user, idx) => (
                      <div className="dashboard-user-card" key={user._id || idx}>
                        <div className="dashboard-user-avatar" style={{background:user.type==='teacher'?'#e3f2fd':'#ffeaea',color:user.type==='teacher'?'#2196F3':'#ff4757'}}>
                          {user.fullName ? user.fullName[0].toUpperCase() : (user.username ? user.username[0].toUpperCase() : 'U')}
                        </div>
                        <div className="dashboard-user-info">
                          <div className="dashboard-user-name">{user.fullName || user.username}</div>
                          <div className="dashboard-user-meta">
                            <span className={`dashboard-user-role ${user.type}`}>{user.type.charAt(0).toUpperCase() + user.type.slice(1)}</span>
                            <span className="dashboard-user-email">{user.email}</span>
                          </div>
                          <div className="dashboard-user-status-row">
                            <span className="status-badge active">Active</span>
                            <span className="dashboard-user-lastlogin">Last login: {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '-'}</span>
                          </div>
                        </div>
                        <div className="dashboard-user-actions">
                          <button className="dashboard-btn small" onClick={() => handleShowProfile(user)}>Profile</button>
                        </div>
                      </div>
                    ))
                )}
              </div>
              {/* Teacher Profile Modal */}
              {showProfileModal && profileUser && (
                <div className="modal-overlay">
                  <div className="modal-content">
                    <h2 style={{marginBottom:8}}>
                      {profileUser.type === 'teacher' ? 'Teacher Profile' : profileUser.type === 'parent' ? 'Parent Profile' : 'User Profile'}
                    </h2>
                    <div style={{display:'flex',alignItems:'center',gap:24}}>
                      <div>
                        {/* Placeholder for photo, can be replaced with real photo field */}
                        <div style={{width:100,height:100,borderRadius:'50%',background:'#e3f2fd',display:'flex',alignItems:'center',justifyContent:'center',fontSize:48,color:'#2196F3'}}>
                          {profileUser.fullName ? profileUser.fullName[0] : 'U'}
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:22,fontWeight:600}}>{profileUser.fullName || profileUser.username}</div>
                        <div style={{marginTop:8,color:'#555'}}>Role: {profileUser.type}</div>
                        <div style={{marginTop:8,color:'#555'}}>Email: {profileUser.email}</div>
                        {profileUser.type === 'teacher' && (
                          <div style={{marginTop:8,color:'#555'}}>
                            Contact Number: {profileUser.contact || profileUser.contactNumber || 'N/A'}
                          </div>
                        )}
                        {profileUser.type === 'parent' && (
                          <div style={{marginTop:8,color:'#555'}}>
                            Contact Number: {profileUser.contact || profileUser.contactNumber || 'N/A'}
                          </div>
                        )}
                        {/* Bio placeholder, can be extended */}
                        <div style={{marginTop:12}}><strong>Bio:</strong> {profileUser.bio || 'No bio set.'}</div>
                        {/* Teacher: Show handled sections/subjects */}
                        {profileUser.type === 'teacher' && Array.isArray(profileUser.assignedSections) && profileUser.assignedSections.length > 0 && (
                          <div style={{marginTop:12}}>
                            <strong>Handled Sections/Subjects:</strong>
                            <ul style={{margin:'8px 0 0 16px',padding:0}}>
                              {profileUser.assignedSections.map((sec, idx) => (
                                <li key={idx} style={{marginBottom:4}}>
                                  {sec.sectionName ? <span>Section: <b>{sec.sectionName}</b></span> : null}
                                  {sec.subjectName ? <span> &nbsp;|&nbsp; Subject: <b>{sec.subjectName}</b></span> : null}
                                  {(!sec.sectionName && !sec.subjectName) ? <span>Unknown</span> : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {/* Parent: Show linked students (names) */}
                        {profileUser.type === 'parent' && (
                          <div style={{marginTop:12}}>
                            <strong>Linked Student(s):</strong>
                            <ul style={{margin:'8px 0 0 16px',padding:0}}>
                              {(() => {
                                // Debug log for profileUser
                                console.log('[ADMIN MODAL] profileUser:', profileUser);
                                let linked = profileUser.linkedStudent;
                                if (!Array.isArray(linked)) {
                                  if (typeof linked === 'string' && linked) linked = [linked];
                                  else if (linked == null) linked = [];
                                  else linked = Array.from(linked);
                                }
                                const linkedStr = linked.map(id => id && id.toString());
                                console.log('[ADMIN MODAL] LinkedStudent:', linkedStr);
                                console.log('[ADMIN MODAL] studentList:', studentList);
                                if (!linkedStr || linkedStr.length === 0) {
                                  return <li style={{color:'#888'}}>No linked students.</li>;
                                }
                                return linkedStr.map((studentId, idx) => {
                                  const student = studentList.find(s => (s._id && s._id.toString()) === studentId || (s.studentId && s.studentId.toString()) === studentId);
                                  return (
                                    <li key={idx} style={{marginBottom:4}}>
                                      {student ? `${student.fullName} (${student.studentId || student._id})` : studentId}
                                    </li>
                                  );
                                });
                              })()}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{marginTop:24,textAlign:'right'}}>
                      <button className="dashboard-btn" onClick={handleCloseProfile}>Close</button>
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
          )}
          {/* Announcements Section */}
          {activeSection === 'announcements' && (
            <div className="dashboard-announcements-section" style={{maxWidth: 900, margin: '0 auto'}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                <FontAwesomeIcon icon={faComments} style={{fontSize: '32px', color: '#2196F3'}} />
                <h2 style={{fontWeight:700, fontSize:28, color:'#2196F3', margin:0}}>Announcements</h2>
              </div>
              <div className="announcement-form-card" style={{background:'#f8fafc',borderRadius:16,boxShadow:'0 2px 16px rgba(33,150,243,0.08)',padding:'32px 28px',marginBottom:32}}>
                <form className="announcement-form" onSubmit={handleSendAdminMessage} style={{display:'flex',flexDirection:'column',gap:20}}>
                  <div style={{display:'flex',gap:18,alignItems:'center',flexWrap:'wrap'}}>
                    <select value={adminMessageRecipient} onChange={e=>setAdminMessageRecipient(e.target.value)} style={{padding:'12px 18px',borderRadius:10,border:'1.5px solid #b6d0f7',fontWeight:600,minWidth:200,background:'#fff'}} required>
                      <option value="">Select Audience</option>
                      <option value="teachers">All Teachers</option>
                      <option value="parents">All Parents</option>
                      <option value="both">All Teachers & Parents</option>
                    </select>
                    <input type="text" placeholder="Announcement Title" style={{flex:1,padding:'12px 18px',borderRadius:10,border:'1.5px solid #b6d0f7',fontWeight:500,background:'#fff'}} value={adminMessageTitle || ''} onChange={e=>setAdminMessageTitle(e.target.value)} required />
                  </div>
                  <textarea placeholder="Write your announcement here..." style={{padding:'14px 18px',borderRadius:10,border:'1.5px solid #b6d0f7',fontWeight:500,minHeight:90,background:'#fff'}} value={adminMessageContent} onChange={e=>setAdminMessageContent(e.target.value)} required />
                  <div style={{display:'flex',justifyContent:'flex-end',gap:16,alignItems:'center'}}>
                    {adminMessageError && <span style={{color:'#ff4757',fontWeight:500}}>{adminMessageError}</span>}
                    {adminMessageSuccess && <span style={{color:'#38b2ac',fontWeight:500}}>{adminMessageSuccess}</span>}
                    <button type="submit" className="dashboard-btn primary" disabled={adminMessageSending} style={{padding:'12px 40px',fontWeight:700,fontSize:18,background:'#2196F3',color:'#fff',borderRadius:10,boxShadow:'0 2px 8px rgba(33,150,243,0.10)'}}>
                      {adminMessageSending ? 'Sending...' : 'Announce'}
                    </button>
                  </div>
                </form>
              </div>
              <div className="announcement-table-card" style={{background:'#fff',borderRadius:16,boxShadow:'0 2px 16px rgba(33,150,243,0.06)',padding:'24px 18px'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                  <span style={{fontSize:22,color:'#2196F3'}}>📋</span>
                  <h3 style={{margin:0,fontWeight:600,fontSize:22,color:'#2196F3'}}>Announcement History</h3>
                </div>
                <table className="dashboard-table" style={{background:'#fff',borderRadius:10,overflow:'hidden'}}>
                  <thead style={{background:'#e3f2fd'}}>
                    <tr>
                      <th style={{padding:'12px 8px'}}>Title</th>
                      <th style={{padding:'12px 8px'}}>Posted By</th>
                      <th style={{padding:'12px 8px'}}>Date</th>
                      <th style={{padding:'12px 8px'}}>Audience</th>
                      <th style={{padding:'12px 8px'}}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {announcements.length === 0 ? (
                      <tr><td colSpan="5" style={{textAlign:'center',color:'#888',padding:'18px'}}>No announcements yet.</td></tr>
                    ) : (
                      announcements.map((a, idx) => (
                        <tr key={a.id || idx} style={{borderBottom:'1px solid #f1f5f9'}}>
                          <td style={{padding:'10px 8px',fontWeight:600}}>{a.title}</td>
                          <td style={{padding:'10px 8px'}}>{a.postedBy || 'Admin'}</td>
                          <td style={{padding:'10px 8px'}}>{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</td>
                          <td style={{padding:'10px 8px'}}>{a.audience === 'both' ? 'All' : a.audience === 'teachers' ? 'Teachers' : 'Parents'}</td>
                          <td style={{padding:'10px 8px'}}><span className="status-badge active">Published</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        {/* Manage Student Section */}
        {activeSection === 'students' && (
          <div className="dashboard-manage-student-section">
            <ManageStudent 
              refreshDashboard={fetchUsers}
              goToOverview={() => setActiveSection('overview')} 
            />
          </div>
        )}
    {/* Manage Subject/Section Section */}
    {activeSection === 'subjectSection' && (
      <div className="dashboard-manage-subject-section">
        <ManageSubjectSection />
      </div>
    )}

        </div>
      </div>
    </div>
  );
}

export default DashboardAdmin;
