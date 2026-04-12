import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { fetchSubjectSections } from './subjectSectionApi';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { fetchStudents } from '../../../api/studentApi';
import { fetchUserProfile } from '../../../api/userApi';
import * as faceapi from 'face-api.js';
import { loadFaceApiModels, areModelsLoaded } from '../../../shared/faceApiLoader';
import { debugFaceRecognition, debugDescriptor } from '../../../shared/debugHelper';
import { addAttendance } from './attendanceApi';
import { getStatusByArrivalTime } from '../../../utils/attendanceStatusHelper';

function FaceRecognition() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [autoScanned, setAutoScanned] = useState(false);
  const [students, setStudents] = useState([]);
  const [faceVisible, setFaceVisible] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [webcamReady, setWebcamReady] = useState(false);
  const [webcamError, setWebcamError] = useState(null);
  const [sectionList, setSectionList] = useState(['Test Section']);
  const [subjectList, setSubjectList] = useState(['Test Subject']);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [scannedStudents, setScannedStudents] = useState([]); // Track scanned studentIds
  const [teacherId, setTeacherId] = useState(null);
  const [teacherName, setTeacherName] = useState('Unknown');
  const webcamRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch section/subject options and filter by teacher assignments
    let localTeacherId = null;
    let assignedSections = [];
    let assignedSubjects = [];
    // TODO: Replace with a prop, context, or backend session fetch
    // For now, try to get teacherId from a global or context (not localStorage)
    // Example: window.currentUser or from a React context
    if (window.currentUser && (window.currentUser.username || window.currentUser._id)) {
      localTeacherId = window.currentUser._id || window.currentUser.username;
      setTeacherId(localTeacherId);
      setTeacherName(window.currentUser.fullName || window.currentUser.username || 'Unknown');
    }
    const fetchAndFilter = async () => {
      let profile = null;
      if (localTeacherId) {
        try {
          profile = await fetchUserProfile(localTeacherId);
        } catch {}
      }
      let allSections = [];
      let allSubjects = [];
      try {
        const data = await fetchSubjectSections();
        allSections = [...new Set(data.map(item => item.section))];
        allSubjects = [...new Set(data.map(item => item.subject))];
      } catch {}
      if (profile) {
        if (Array.isArray(profile.assignedSections)) {
          assignedSections = profile.assignedSections.map(s => s.sectionName).filter(Boolean);
          assignedSubjects = profile.assignedSections.map(s => s.subjectName).filter(Boolean);
        }
        if (Array.isArray(profile.subjects)) {
          assignedSubjects = assignedSubjects.concat(profile.subjects.map(s => s.subjectName || s.type || s.name || s).filter(Boolean));
        }
      }
  const fallbackSections = allSections.length ? allSections : ['Test Section'];
  const fallbackSubjects = allSubjects.length ? allSubjects : ['Test Subject'];
  setSectionList(assignedSections.length ? [...new Set(assignedSections)] : fallbackSections);
  setSubjectList(assignedSubjects.length ? [...new Set(assignedSubjects)] : fallbackSubjects);
      // Students
      try {
        const data = await fetchStudents();
        if (assignedSections.length > 0) {
          setStudents(data.filter(s => assignedSections.includes(s.section)));
        } else {
          setStudents(data);
        }
      } catch {
        setStudents([]);
      }
    };
    fetchAndFilter();
    // Load models
    const loadModelsAndTF = async () => {
      try {
        if (window.tf && window.tf.ready) {
          await window.tf.ready();
        }
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        if (
          faceapi.nets.ssdMobilenetv1.isLoaded &&
          faceapi.nets.faceRecognitionNet.isLoaded &&
          faceapi.nets.faceLandmark68Net.isLoaded
        ) {
          setModelsLoaded(true);
        } else {
          setWebcamError('Some face models failed to load.');
        }
      } catch (err) {
        setWebcamError('Failed to load face models or TensorFlow backend.');
        console.error('Model load error:', err);
      }
    };
    loadModelsAndTF();
  }, []);

  // Webcam ready handler
  const handleWebcamReady = () => {
    setWebcamReady(true);
    setWebcamError(null);
  };

  // Webcam error handler
  const handleWebcamError = (err) => {
    setWebcamError('Webcam access denied or not available. Please check your browser permissions and try again.');
    setWebcamReady(false);
  };

  // Real-time face detection
  useEffect(() => {
    let interval = null;
    if (!modelsLoaded || !webcamReady) return;
    // Extra model loaded check before detection
    const allModelsLoaded = () => (
      faceapi.nets.ssdMobilenetv1.isLoaded &&
      faceapi.nets.faceRecognitionNet.isLoaded &&
      faceapi.nets.faceLandmark68Net.isLoaded
    );
    const checkFaceRealtime = async () => {
      try {
        if (!allModelsLoaded()) {
          setWebcamError('Face models not fully loaded.');
          return;
        }
        if (window.tf && window.tf.ready) {
          await window.tf.ready();
        }
        const video = webcamRef.current && webcamRef.current.video;
        if (!video || video.readyState !== 4) {
          setFaceVisible(null);
          setAutoScanned(false);
          return;
        }
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
          setFaceVisible(null);
          setAutoScanned(false);
          return;
        }
        const img = await faceapi.fetchImage(imageSrc);
        let detection = await faceapi
          .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (!detection) {
          detection = await faceapi
            .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.1 }))
            .withFaceLandmarks()
            .withFaceDescriptor();
        }
        setFaceVisible(detection ? true : false);
        // Automatically scan if face detected and not already scanned
        if (detection && !scanning && !autoScanned) {
          setAutoScanned(true);
          handleScanAuto(detection.descriptor);
        } else if (!detection) {
          setAutoScanned(false);
        }
      } catch (err) {
        setWebcamError('Face detection failed. Models or backend may not be loaded.');
        console.error('Detection error:', err);
      }
    };
    interval = setInterval(checkFaceRealtime, 700);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [modelsLoaded, webcamReady, scanning, autoScanned, students]);

  // New: auto scan handler
  const handleScanAuto = async (descriptor) => {
    setScanning(true);
    setResult(null);
    // Capture webcam image as base64
    let capturedImage = null;
    if (webcamRef.current) {
      capturedImage = webcamRef.current.getScreenshot();
    }
    // Find best match among students (already filtered by section)
    let bestMatch = null;
    let bestDistance = 1.0;
    students.forEach(student => {
      if (student.descriptor && student.descriptor.length === 128) {
        // Skip if student already scanned in this session
        if (scannedStudents.includes(student.studentId)) return;
        const distance = faceapi.euclideanDistance(descriptor, student.descriptor);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = student;
        }
      }
    });
    // Save attendance to backend if a match is found
    if (bestMatch && bestDistance < 0.6 && bestMatch.section === selectedSection) {
      try {
        const now = new Date();
        const localTime = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const arrivalTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        const status = getStatusByArrivalTime(arrivalTime);
        
        const response = await addAttendance({
          name: bestMatch.fullName,
          studentId: bestMatch.studentId,
          section: bestMatch.section,
          subject: selectedSubject || '',
          status: status,
          timestamp: new Date().toISOString(),
          date: new Date().toISOString().slice(0, 10),
          arrivalTime: arrivalTime,
          viaFacialRecognition: true,
          recordedAt: new Date().toISOString(),
          time: localTime,
          recordedBy: teacherId,
          recordedByName: teacherName,
          image: capturedImage // base64 image
        });
        setScannedStudents(prev => [...prev, bestMatch.studentId]); // Mark as scanned
        console.log('Attendance POST response:', response);
        setResult({ success: true, name: bestMatch.fullName, confidence: 1 - bestDistance, scanTime: localTime });
      } catch (err) {
        if (err.response && err.response.status === 409) {
          setScannedStudents(prev => [...prev, bestMatch.studentId]); // Mark as scanned if backend says already scanned
          setResult({ success: false, alreadyScanned: true });
        } else {
          setResult({ success: false });
        }
        console.error('Attendance save error:', err);
      }
    } else if (bestMatch && bestDistance < 0.6 && bestMatch.section === selectedSection) {
      setResult({ success: false });
    } else if (bestMatch && bestDistance < 0.6) {
      setResult({ success: false });
    } else {
      setResult({ success: false });
    }
    setScanning(false);
  };

  const handleScan = async () => {
    if (faceVisible !== true) {
      alert('No face detected. Please ensure your face is clearly visible and try again.');
      return;
    }
    // Extra model loaded check before manual scan
    if (!(faceapi.nets.ssdMobilenetv1.isLoaded && faceapi.nets.faceRecognitionNet.isLoaded && faceapi.nets.faceLandmark68Net.isLoaded)) {
      alert('Face models not fully loaded. Please wait and try again.');
      return;
    }
    setScanning(true);
    setResult(null);
    // Capture image from webcam
    const imageSrc = webcamRef.current.getScreenshot();
    const img = new window.Image();
    img.src = imageSrc;
    await new Promise(resolve => { img.onload = resolve; });
    let detection = null;
    try {
      detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
    } catch (err) {
      setScanning(false);
      setResult({ success: false });
      setWebcamError('Face detection failed. Models or backend may not be loaded.');
      console.error('Manual scan detection error:', err);
      return;
    }
    if (!detection || !detection.descriptor) {
      setScanning(false);
      setResult({ success: false });
      return;
    }
    // Find best match among students
    let bestMatch = null;
    let bestDistance = 1.0;
    students.forEach(student => {
      if (student.descriptor && student.descriptor.length === 128) {
        const distance = faceapi.euclideanDistance(detection.descriptor, student.descriptor);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = student;
        }
      }
    });
    // Only allow scan if bestMatch is in students (filtered by section) AND section matches selectedSection
    if (bestMatch && bestDistance < 0.6 && bestMatch.section === selectedSection) {
      try {
        const now = new Date();
        const arrivalTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        const status = getStatusByArrivalTime(arrivalTime);
        
        const response = await addAttendance({
          name: bestMatch.fullName,
          studentId: bestMatch.studentId,
          section: bestMatch.section,
          subject: selectedSubject || '',
          status: status,
          timestamp: new Date().toISOString(),
          date: new Date().toISOString().slice(0, 10),
          arrivalTime: arrivalTime,
          viaFacialRecognition: true,
          recordedAt: new Date().toISOString(),
          time: new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }),
          recordedBy: teacherId,
          recordedByName: teacherName
        });
        console.log('Attendance POST response:', response);
        const scanTime = new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setResult({ success: true, name: bestMatch.fullName, confidence: 1 - bestDistance, scanTime });
      } catch (err) {
        if (err.response && err.response.status === 409) {
          setResult({ success: false, alreadyScanned: true });
        } else {
          setResult({ success: false });
        }
        console.error('Attendance save error:', err);
      }
    } else if (bestMatch && bestDistance < 0.6 && bestMatch.section === selectedSection) {
      setResult({ success: false });
    } else if (bestMatch && bestDistance < 0.6) {
      setResult({ success: false });
    } else {
      setResult(prev => prev && prev.alreadyScanned ? { success: false, alreadyScanned: true } : { success: false });
    }
    setScanning(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e3f0ff 0%, #f8fafc 100%)', fontFamily: 'Segoe UI, Arial, sans-serif', padding: '40px 0' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', borderRadius: 18, boxShadow: '0 4px 32px rgba(33,150,243,0.10)', padding: '32px 32px 24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ fontSize: 36, color: '#1976d2' }}>🤳</span>
          <span style={{ fontWeight: 700, fontSize: 26, color: '#1976d2', letterSpacing: 1 }}>Facial Recognition</span>
        </div>
        <div style={{ display: 'flex', gap: 18, marginBottom: 18, width: '100%' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 600, color: '#1976d2', marginBottom: 4, display: 'block' }}>Section</label>
            <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #bcd0ee', fontSize: 15, background: '#f7fafc' }}>
              <option value="">Select section</option>
              {sectionList.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 600, color: '#1976d2', marginBottom: 4, display: 'block' }}>Subject</label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #bcd0ee', fontSize: 15, background: '#f7fafc' }}>
              <option value="">Select subject</option>
              {subjectList.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
        </div>
        {(!selectedSection || !selectedSubject) ? (
          <div style={{ marginTop: 32, color: '#e53e3e', fontWeight: 600, fontSize: '1.1em', textAlign: 'center' }}>Please select a section and subject to start face recognition.</div>
        ) : (
          <>
            <div style={{ background: '#f7fafc', borderRadius: 14, boxShadow: '0 2px 12px rgba(33,150,243,0.07)', padding: 18, marginBottom: 18, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                width={340}
                height={255}
                mirrored={true}
                style={{ borderRadius: 10, border: '2px solid #bcd0ee', background: '#e3f0ff' }}
                onUserMedia={handleWebcamReady}
                onUserMediaError={handleWebcamError}
              />
              <div style={{ marginTop: 10, fontWeight: 600, fontSize: 15 }}>
                {webcamError && <span style={{ color: 'red' }}>{webcamError}</span>}
                {!webcamError && !modelsLoaded && <span style={{ color: '#888' }}>Loading face recognition models...</span>}
                {!webcamError && modelsLoaded && !webcamReady && <span style={{ color: '#888' }}>Initializing webcam...</span>}
                {!webcamError && modelsLoaded && webcamReady && faceVisible === true && <span style={{ color: '#38b2ac' }}>Face detected</span>}
                {!webcamError && modelsLoaded && webcamReady && faceVisible === false && <span style={{ color: '#e53e3e' }}>No face detected</span>}
                {!webcamError && modelsLoaded && webcamReady && faceVisible === null && <span style={{ color: '#888' }}>Checking...</span>}
              </div>
            </div>
            <button
              style={{ marginTop: 0, padding: '10px 32px', borderRadius: 8, border: 'none', background: '#1976d2', color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: 1, cursor: 'pointer', boxShadow: '0 2px 8px rgba(33,150,243,0.07)' }}
              onClick={() => navigate(-1)}
            >
              Back
            </button>
            <div style={{ marginTop: 18, width: '100%' }}>
              <div className="face-recognition-ui-result" style={{ textAlign: 'center' }}>
                {scanning && <span className="face-recognition-ui-scanning" style={{ color: '#1976d2', fontWeight: 600 }}>Scanning...</span>}
                {!scanning && result && result.success && (
                  <div className="face-recognition-ui-success" style={{ color: '#38a169', fontWeight: 700, fontSize: 18 }}>
                    <span className="face-recognition-ui-result-icon">✅</span>
                    <span>Welcome, {result.name}!</span>
                    <br />
                    <span style={{ color: '#1976d2', fontWeight: 'bold' }}>Scanned at: {result.scanTime}</span>
                  </div>
                )}
                {!scanning && result && !result.success && result.alreadyScanned ? (
                  <div className="face-recognition-ui-error" style={{ color: '#e53e3e', fontWeight: 600 }}>
                    <span className="face-recognition-ui-result-icon">❌</span>
                    <span>Face already scan.</span>
                  </div>
                ) : !scanning && result && !result.success ? (
                  <div className="face-recognition-ui-error" style={{ color: '#e53e3e', fontWeight: 600 }}>
                    <span className="face-recognition-ui-result-icon">❌</span>
                    <span>Face not recognized.</span>
                  </div>
                ) : null}
                {!scanning && !result && (
                  <span className="face-recognition-ui-no-face" style={{ color: '#888' }}>No face detected.</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default FaceRecognition;
