import { exportAttendanceToExcel } from './exportAttendance';
import React, { useState, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import './styles/ManageAttendance.css';
import { fetchAttendance, deleteAttendance, updateAttendance } from './attendanceApi';
import { fetchUserProfile } from '../../../api/userApi';
import { getStatusWithColor } from '../../../utils/attendanceStatusHelper';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';



const ManageAttendance = () => {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [allowedSubjects, setAllowedSubjects] = useState([]);
    const [allowedTeachers, setAllowedTeachers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [attendanceData, setAttendanceData] = useState([]);
    const [allowedSections, setAllowedSections] = useState([]);
    const [lastUpdate, setLastUpdate] = useState(Date.now());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadAttendance = async () => {
            setLoading(true);
            try {
                let teacherId = null;
                if (window.currentUser && (window.currentUser._id || window.currentUser.username)) {
                    teacherId = window.currentUser._id || window.currentUser.username;
                }
                let allowedSectionsArr = [];
                let allowedSubjectsArr = [];
                if (teacherId) {
                    try {
                        const profile = await fetchUserProfile(teacherId);
                        if (profile && Array.isArray(profile.assignedSections)) {
                            allowedSectionsArr = profile.assignedSections.map(s => s.sectionName);
                            if (profile.assignedSections.some(s => s.subjects)) {
                                if (selectedSection) {
                                    const sectionObj = profile.assignedSections.find(s => s.sectionName === selectedSection);
                                    allowedSubjectsArr = sectionObj && Array.isArray(sectionObj.subjects) ? sectionObj.subjects : [];
                                    if (!allowedSubjectsArr.length) {
                                        allowedSubjectsArr = profile.assignedSections.flatMap(s => s.subjects || []);
                                        allowedSubjectsArr = [...new Set(allowedSubjectsArr)];
                                    }
                                } else {
                                    allowedSubjectsArr = profile.assignedSections.flatMap(s => s.subjects || []);
                                    allowedSubjectsArr = [...new Set(allowedSubjectsArr)];
                                }
                            }
                        }
                    } catch {}
                }
                // Fetch attendance data from backend
                const data = await fetchAttendance({ 
                    startDate: startDate || selectedDate, 
                    endDate: endDate || selectedDate, 
                    section: selectedSection 
                });

                // Allowed sections present in today's attendance records
                const sectionSet = new Set();
                data.forEach(record => {
                    if (
                        record.section
                    ) {
                        sectionSet.add(record.section);
                    }
                });
                setAllowedSections(Array.from(sectionSet));

                // Allowed subjects present in today's attendance records
                const subjectSet = new Set();
                data.forEach(record => {
                    if (
                        record.subject
                    ) {
                        subjectSet.add(record.subject);
                    }
                });
                setAllowedSubjects(Array.from(subjectSet));

                // Extract unique teachers from attendance records
                const teacherSet = new Set();
                const teacherMap = new Map();
                data.forEach(record => {
                    if (record.recordedByName && record.recordedByName !== 'Unknown') {
                        teacherSet.add(record.recordedByName);
                        if (record.recordedBy) {
                            teacherMap.set(record.recordedByName, record.recordedBy._id || record.recordedBy);
                        }
                    }
                });
                setAllowedTeachers(Array.from(teacherSet));

                // Filter data for allowed sections if teacher has restricted access
                const filtered = allowedSectionsArr.length > 0 
                    ? data.filter(record => allowedSectionsArr.includes(record.section))
                    : data;
                    
                setAttendanceData(filtered);
                setLastUpdate(Date.now());
            } catch (err) {
                setError('Failed to load attendance records');
            }
            setLoading(false);
        };
        loadAttendance();

        // Socket.IO setup for real-time updates
    const socket = io(process.env.REACT_APP_API_URL);
        socket.on('attendance:new', (newRecord) => {
            if (
                new Date(newRecord.date).toISOString().slice(0, 10) === selectedDate &&
                (allowedSections.length === 0 || allowedSections.includes(newRecord.section))
            ) {
                setAttendanceData(prev => [newRecord, ...prev]);
                setLastUpdate(Date.now());
            }
        });
        return () => {
            socket.disconnect();
        };
    }, [selectedDate, startDate, endDate, selectedSection, selectedSubject]);

    // Filter attendance data (do NOT filter out absent records)
    const filteredAttendance = useMemo(() => {
        return attendanceData.filter(record => {
            const recordDate = new Date(record.date).toISOString().slice(0, 10);
            let matchesDate = true;
            
            // If date range is specified, filter by date range
            if (startDate && endDate) {
                matchesDate = recordDate >= startDate && recordDate <= endDate;
            } else if (startDate) {
                matchesDate = recordDate >= startDate;
            } else if (endDate) {
                matchesDate = recordDate <= endDate;
            } else {
                // If no date range specified, show today's records
                matchesDate = recordDate === selectedDate;
            }
            
            const matchesSection = !selectedSection || record.section === selectedSection;
            const matchesSubject = !selectedSubject || record.subject === selectedSubject;
            const matchesTeacher = !selectedTeacher || record.recordedByName === selectedTeacher;
            const matchesSearch = !searchTerm ||
                (record.name && record.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (String(record.studentId).toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesDate && matchesSection && matchesSubject && matchesTeacher && matchesSearch;
        });
    }, [attendanceData, selectedDate, startDate, endDate, selectedSection, selectedSubject, selectedTeacher, searchTerm]);

    // Summary statistics using filtered data
    const summary = useMemo(() => {
        const present = filteredAttendance.filter(r => (r.status && r.status.toLowerCase() === 'present')).length;
        const absent = filteredAttendance.filter(r => (r.status && r.status.toLowerCase() === 'absent')).length;
        const late = filteredAttendance.filter(r => r.status && r.status.toLowerCase() === 'late').length;
        return { present, absent, late, total: present + absent + late };
    }, [filteredAttendance]);

    // Update attendance status
    const handleStatusChange = async (recordId, newStatus) => {
        try {
            // Use device's local time zone for attendance time
            const localTime = new Date().toLocaleTimeString(undefined, { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const currentDateTime = new Date().toISOString();
            await updateAttendance(recordId, {
                status: newStatus,
                timestamp: newStatus !== 'Absent' ? localTime : '-',
                recordedAt: currentDateTime
            });
            setAttendanceData(prev => prev.map(record =>
                record._id === recordId
                    ? { ...record, status: newStatus, timestamp: newStatus !== 'Absent' ? localTime : '-', recordedAt: currentDateTime }
                    : record
            ));
            setLastUpdate(Date.now());
        } catch (err) {
            alert('Failed to update attendance status');
        }
    };

    // Delete attendance record
    const handleDeleteRecord = async (recordId) => {
        const recordToDelete = attendanceData.find(record => record._id === recordId);
        const studentName = recordToDelete ? recordToDelete.name : 'Unknown Student';
        if (window.confirm(`Are you sure you want to delete the attendance record for ${studentName}?`)) {
            try {
                await deleteAttendance(recordId);
                setAttendanceData(prev => prev.filter(record => record._id !== recordId));
                setLastUpdate(Date.now());
                alert(`✅ Attendance record for ${studentName} has been deleted.`);
            } catch (err) {
                alert('Failed to delete attendance record');
            }
        }
    };

    // Delete all attendance records for a student
    const handleDeleteAllAttendanceForStudent = async (studentId, studentName) => {
        if (window.confirm(`Are you sure you want to delete ALL attendance records for ${studentName}?`)) {
            try {
                const response = await fetch(`${process.env.REACT_APP_API_URL}/api/attendance/deleteByStudent/${studentId}`, {
                    method: 'DELETE',
                });
                if (response.ok) {
                    setAttendanceData(prev => prev.filter(record => record.studentId !== studentId));
                    setLastUpdate(Date.now());
                    alert(`✅ All attendance records for ${studentName} have been deleted.`);
                } else {
                    alert('Failed to delete all attendance records for this student');
                }
            } catch (err) {
                alert('Failed to delete all attendance records for this student');
            }
        }
    };

    // Group attendance records by studentId using filtered data
    const groupedAttendance = useMemo(() => {
        const map = new Map();
        filteredAttendance.forEach(record => {
            if (!map.has(record.studentId)) {
                map.set(record.studentId, {
                    studentId: record.studentId,
                    name: record.name,
                    section: record.section,
                    subject: record.subject,
                    records: [record]
                });
            } else {
                map.get(record.studentId).records.push(record);
            }
        });
        return Array.from(map.values());
    }, [filteredAttendance]);

    if (loading) return <div>Loading attendance records...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;

    return (
        <div className="manage-attendance-container" style={{ backgroundColor: '#43a047' }}>
            <div className="page-header">
                <div className="header-top" style={{ justifyContent: 'flex-start', gap: '24px' }}>
                    <button 
                        onClick={() => navigate(-1)} 
                        className="back-button"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <span style={{ fontSize: '1.2em' }}>←</span> Back
                    </button>
                    <h1 style={{ marginLeft: 0 }}>📋 Manage Attendance</h1>
                </div>
            </div>
                        <div className="filters-container">
                            <div className="filter-group">
                                <label>📆 View by Date Range:</label>

                                <div className="date-range">
                                    <input
                                        type="date"
                                        id="start-date"
                                        value={startDate}
                                        max={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />

                                    <span style={{ margin: "0 8px" }}>to</span>

                                    <input
                                        type="date"
                                        id="end-date"
                                        value={endDate}
                                        max={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })}
                                        min={startDate} // prevent end date before start date
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="filter-group">
                                <label htmlFor="section">🏫 Filter by Section:</label>
                                <select
                                    id="section"
                                    value={selectedSection}
                                    onChange={(e) => {
                            setSelectedSection(e.target.value);
                            setSelectedSubject('');
                        }}
                    >
                        <option value="">All Sections</option>
                        {allowedSections.length === 0 ? (
                            <option value="" disabled>No sections available</option>
                        ) : (
                            allowedSections.map(section => (
                                <option key={section} value={section}>{section}</option>
                            ))
                        )}
                    </select>
                </div>
                <div className="filter-group">
                    <label htmlFor="subject">📚 Filter by Subject:</label>
                    <select
                        id="subject"
                        value={selectedSubject}
                        onChange={e => setSelectedSubject(e.target.value)}
                        disabled={allowedSubjects.length === 0}
                    >
                        <option value="">All Subjects</option>
                        {allowedSubjects.map(subject => (
                            <option key={subject} value={subject}>{subject}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label htmlFor="teacher">👨‍🏫 Filter by Teacher:</label>
                    <select
                        id="teacher"
                        value={selectedTeacher}
                        onChange={e => setSelectedTeacher(e.target.value)}
                        disabled={allowedTeachers.length === 0}
                    >
                        <option value="">All Teachers</option>
                        {allowedTeachers.map(teacher => (
                            <option key={teacher} value={teacher}>{teacher}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label htmlFor="search">🔍 Search:</label>
                        <input
                            type="text"
                            id="search"
                            placeholder="Search by name or student ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        className="dashboard-btn"
                        style={{ background: '#38a169', color: '#fff', fontWeight: 700, borderRadius: 6, padding: '8px 18px', cursor: selectedSection && selectedSubject ? 'pointer' : 'not-allowed', opacity: selectedSection && selectedSubject ? 1 : 0.5, marginBottom: 0 }}
                        disabled={!selectedSection || !selectedSubject}
                        onClick={() => exportAttendanceToExcel(filteredAttendance, selectedSection, selectedSubject)}
                    >
                        Export to Excel
                    </button>
                </div>
            </div>
            {/* Summary Cards */}
           <div className="summary-container">
                <div className="summary-card present">
                    <div className="summary-icon">✅</div>
                    <div className="summary-content">
                        <h3>{summary.present}</h3>
                        <p>Present</p>
                    </div>
                </div>
                <div className="summary-card absent">
                    <div className="summary-icon">❌</div>
                    <div className="summary-content">
                        <h3>{summary.absent}</h3>
                        <p>Absent</p>
                    </div>
                </div>
                <div className="summary-card late">
                    <div className="summary-icon">⏰</div>
                    <div className="summary-content">
                        <h3>{summary.late}</h3>
                        <p>Late</p>
                    </div>
                </div>
                <div className="summary-card total">
                    <div className="summary-icon">👥</div>
                    <div className="summary-content">
                        <h3>{summary.total}</h3>
                        <p>Total</p>
                    </div>
                </div>
            </div>
            <div className="table-container">
                <div className="table-header">
                    <div className="table-title-section">
                        <h2>📊 Attendance Records</h2>
                        <p>Real-time attendance tracking and management</p>
                    </div>
                    <div className="record-count">
                        {filteredAttendance.length} record{filteredAttendance.length !== 1 ? 's' : ''} found
                    </div>
                </div>
                <div className="table-wrapper">
                    <table className="attendance-table">
                        <thead>
                            <tr>
                                <th>Student Name</th>
                                <th>Student ID</th>
                                <th>Section</th>
                                <th>Subject</th>
                                <th>Status</th>
                                <th>Arrival Time</th>
                                <th>Time</th>
                                <th>Recorded By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedAttendance.length > 0 ? (
                                groupedAttendance.map((student, idx) => (
                                    <React.Fragment key={student.studentId}>
                                        {student.records.map((record, recIdx) => (
                                            <tr key={record._id}>
                                                <td>{record.name}</td>
                                                <td>{record.studentId}</td>
                                                <td>{record.section}</td>
                                                <td>{record.subject}</td>
                                                <td>
                                                    {(() => {
                                                        const statusInfo = getStatusWithColor(record.arrivalTime);
                                                        return (
                                                            <span style={{
                                                                background: statusInfo.background,
                                                                color: statusInfo.text,
                                                                border: `1px solid ${statusInfo.borderColor}`,
                                                                padding: '6px 12px',
                                                                borderRadius: '6px',
                                                                fontWeight: 600,
                                                                fontSize: '13px',
                                                                display: 'inline-block'
                                                            }}>
                                                                {statusInfo.status.charAt(0).toUpperCase() + statusInfo.status.slice(1)}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td>
                                                    {record.arrivalTime ? (
                                                        <span style={{ fontWeight: 500, color: '#333' }}>
                                                            {record.arrivalTime.substring(0, 5)}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#999' }}>-</span>
                                                    )}
                                                </td>
                                                <td>{(() => {
                                                    if (!record.timestamp || record.timestamp === '-') return '-';
                                                    let dateObj;
                                                    if (record.recordedAt) {
                                                        dateObj = new Date(record.recordedAt);
                                                    } else if (!isNaN(Date.parse(record.timestamp))) {
                                                        dateObj = new Date(record.timestamp);
                                                    } else {
                                                        return record.timestamp;
                                                    }
                                                    const y = dateObj.getFullYear();
                                                    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                                                    const d = String(dateObj.getDate()).padStart(2, '0');
                                                    let hour = dateObj.getHours();
                                                    const min = String(dateObj.getMinutes()).padStart(2, '0');
                                                    const ampm = hour >= 12 ? 'PM' : 'AM';
                                                    hour = hour % 12;
                                                    if (hour === 0) hour = 12;
                                                    return `${y}/${m}/${d} - ${hour}:${min} ${ampm}`;
                                                })()}</td>
                                                <td>{record.recordedByName || 'Unknown'}</td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="empty-state">
                                        No attendance records found for the selected criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManageAttendance;