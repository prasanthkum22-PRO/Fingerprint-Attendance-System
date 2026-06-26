import React, { useEffect, useState } from 'react';
import { ref, onValue, set, remove } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { 
  UserPlus, 
  Search, 
  Trash2, 
  GraduationCap, 
  Fingerprint,
  User,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newStudent, setNewStudent] = useState({ name: '', fingerprint_id: '', roll_no: '' });
  
  // Remote Enrollment States
  const [isScanning, setIsScanning] = useState(false);
  const [enrollStatus, setEnrollStatus] = useState('idle');

  useEffect(() => {
    // Fetch students list
    const studentsRef = ref(database, 'students');
    onValue(studentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({
          key,
          ...data[key]
        }));
        setStudents(list);
      } else {
        setStudents([]);
      }
    });
  }, []);

  // Listen to remote enrollment status changes in real-time when scanner is active
  useEffect(() => {
    if (!isScanning) return;

    const statusRef = ref(database, 'settings/enroll_status');
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const status = snapshot.val();
      if (status) {
        setEnrollStatus(status);
        
        // Auto-save student profile to Firebase when enrollment is successful
        if (status === 'success') {
          saveStudentProfile();
        }
      }
    });

    return () => unsubscribe();
  }, [isScanning, newStudent]);

  // Saves the student profile data to /students
  const saveStudentProfile = () => {
    if (!newStudent.name || !newStudent.fingerprint_id) return;
    
    const studentRef = ref(database, 'students/student_' + newStudent.fingerprint_id);
    set(studentRef, {
      name: newStudent.name,
      fingerprint_id: parseInt(newStudent.fingerprint_id),
      roll_no: newStudent.roll_no
    }).then(() => {
      // Keep name, but clear ID/roll so it's ready for another
      setNewStudent(prev => ({ ...prev, fingerprint_id: '', roll_no: '' }));
    }).catch((err) => {
      console.error("Save error:", err);
    });
  };

  // Direct manual addition without trigger fingerprint scanner
  const handleAddStudentManual = (e) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.fingerprint_id) return;

    // Check if fingerprint ID is already taken
    const idExists = students.some(s => s.fingerprint_id === parseInt(newStudent.fingerprint_id));
    if (idExists) {
      alert(`Error: Fingerprint ID #${newStudent.fingerprint_id} is already assigned!`);
      return;
    }

    saveStudentProfile();
    alert("Student profile registered successfully (manual insertion)!");
    setNewStudent({ name: '', fingerprint_id: '', roll_no: '' });
  };

  // Triggers the ESP32 Scanner remote enrollment loop
  const triggerRemoteEnrollment = (e) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.fingerprint_id) {
      alert("Please fill in Student Name and Fingerprint ID first!");
      return;
    }

    // Check if fingerprint ID is already taken
    const idExists = students.some(s => s.fingerprint_id === parseInt(newStudent.fingerprint_id));
    if (idExists) {
      alert(`Error: Fingerprint ID #${newStudent.fingerprint_id} is already assigned!`);
      return;
    }

    // Initialize remote handshake on Firebase
    setIsScanning(true);
    setEnrollStatus('connecting');

    // Write enroll_id (tells ESP32 to start) and reset status
    set(ref(database, 'settings/enroll_id'), parseInt(newStudent.fingerprint_id));
    set(ref(database, 'settings/enroll_status'), 'connecting');
  };

  const cancelEnrollment = () => {
    // Reset remote paths in Firebase
    set(ref(database, 'settings/enroll_id'), 0);
    set(ref(database, 'settings/enroll_status'), 'idle');
    setIsScanning(false);
    setEnrollStatus('idle');
  };

  const handleDeleteStudent = (fingerprintId) => {
    if (window.confirm(`Are you sure you want to delete student with Fingerprint ID #${fingerprintId}? This will remove their profile from the database and instruct the ESP32 to clear their fingerprint from sensor memory.`)) {
      
      // 1. Tell ESP32 to delete the template from sensor hardware
      set(ref(database, 'settings/delete_id'), parseInt(fingerprintId));
      
      // 2. Remove the profile entry
      const studentRef = ref(database, 'students/student_' + fingerprintId);
      remove(studentRef).then(() => {
        alert("Student profile deleted and delete command sent to hardware sensor node!");
      }).catch((error) => {
        alert("Error deleting student: " + error.message);
      });
    }
  };

  // Filter students based on search query
  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.roll_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(student.fingerprint_id).includes(searchQuery)
  );

  // Translate enrollment status keywords to clean user-friendly text and indicators
  const getStatusDisplay = () => {
    switch (enrollStatus) {
      case 'connecting':
        return {
          icon: <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent)' }} />,
          title: "Connecting to ESP32...",
          desc: "Telling the hardware node to enter scanner enrollment mode..."
        };
      case 'waiting_first':
        return {
          icon: <Fingerprint size={48} className="animate-pulse" style={{ color: 'var(--accent)' }} />,
          title: "Place Finger on Scanner",
          desc: "Please place your finger on the optical sensor glass now."
        };
      case 'image_taken':
        return {
          icon: <Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-success)' }} />,
          title: "First Scan Complete",
          desc: "Image captured successfully. Please lift your finger..."
        };
      case 'waiting_second':
        return {
          icon: <Fingerprint size={48} className="animate-pulse" style={{ color: 'var(--accent-light)' }} />,
          title: "Place Same Finger Again",
          desc: "Confirm by placing the same finger on the scanner once more."
        };
      case 'creating_model':
        return {
          icon: <Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-warning)' }} />,
          title: "Creating Fingerprint Template...",
          desc: "Sensor is compiling the model and writing records to EEPROM..."
        };
      case 'success':
        return {
          icon: <CheckCircle2 size={48} style={{ color: 'var(--color-success)' }} />,
          title: "Enrollment Successful!",
          desc: `Saved successfully to ESP32 sensor and database as Student #${newStudent.fingerprint_id}!`
        };
      case 'failed_database_full':
        return {
          icon: <XCircle size={48} style={{ color: 'var(--color-danger)' }} />,
          title: "Sensor Database Full",
          desc: "The optical sensor has run out of index space slots (max 127)."
        };
      case 'failed_timeout':
        return {
          icon: <XCircle size={48} style={{ color: 'var(--color-danger)' }} />,
          title: "Scan Timed Out",
          desc: "No finger was scanned within the timeout window. Please try again."
        };
      case 'failed_not_matched':
        return {
          icon: <XCircle size={48} style={{ color: 'var(--color-danger)' }} />,
          title: "Templates Mismatched",
          desc: "The second scan did not match the first. Please place clean, centered prints."
        };
      default:
        if (enrollStatus.startsWith('failed')) {
          return {
            icon: <XCircle size={48} style={{ color: 'var(--color-danger)' }} />,
            title: "Enrollment Failed",
            desc: `Error details: ${enrollStatus.replace('failed_', '').replace(/_/g, ' ')}`
          };
        }
        return {
          icon: <HelpCircle size={48} style={{ color: 'var(--text-dark)' }} />,
          title: "Scanning Node Status Unknown",
          desc: `Current state: ${enrollStatus}`
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Student Directory</h1>
          <p>Register new profiles, view current database directory, and manage students.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
        
        {/* Left Side: Register Student Form */}
        <div className="dashboard-card" style={{ height: 'fit-content' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <UserPlus size={20} style={{ color: 'var(--accent)' }} /> Register Student
          </h2>
          
          <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>Student Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  value={newStudent.name} 
                  onChange={e => setNewStudent({...newStudent, name: e.target.value})} 
                  required 
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Fingerprint ID (Matches Sensor ID)</label>
              <div style={{ position: 'relative' }}>
                <Fingerprint size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} />
                <input 
                  type="number" 
                  placeholder="e.g. 1, 2, 3..." 
                  value={newStudent.fingerprint_id} 
                  onChange={e => setNewStudent({...newStudent, fingerprint_id: e.target.value})} 
                  required 
                  min="1"
                  max="127"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Roll Number / Code</label>
              <div style={{ position: 'relative' }}>
                <GraduationCap size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="e.g. CS2026-42" 
                  value={newStudent.roll_no} 
                  onChange={e => setNewStudent({...newStudent, roll_no: e.target.value})} 
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={triggerRemoteEnrollment}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Fingerprint size={16} /> Enroll Fingerprint Sensor
              </button>
              
              <button 
                type="button" 
                onClick={handleAddStudentManual}
                style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
              >
                Create Database Profile Only (Manual)
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Search Directory */}
        <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h2>Student Directory</h2>
            
            {/* Search Bar */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search database..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ padding: '8px 12px 8px 36px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fingerprint ID</th>
                  <th>Name</th>
                  <th>Roll No</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                      No students found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(student => (
                    <tr key={student.key}>
                      <td style={{ fontWeight: '600' }}>#{student.fingerprint_id}</td>
                      <td style={{ color: 'var(--text-main)', fontWeight: '500' }}>{student.name}</td>
                      <td>{student.roll_no || 'N/A'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn-danger" 
                          onClick={() => handleDeleteStudent(student.fingerprint_id)}
                          style={{ padding: '6px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Floating Glassmorphic Progress Dialog Modal */}
      {isScanning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(3, 4, 9, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div className="dashboard-card" style={{
            width: '450px',
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '24px',
            background: 'rgba(16, 22, 47, 0.85)',
            borderColor: 'rgba(99, 102, 241, 0.4)'
          }}>
            {/* Status Animated Icon Container */}
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(99, 102, 241, 0.1)'
            }}>
              {statusDisplay.icon}
            </div>

            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '700' }}>{statusDisplay.title}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '8px', lineHeight: '1.4' }}>
                {statusDisplay.desc}
              </p>
            </div>

            {/* Step Guides / Loading Indicators */}
            {enrollStatus !== 'success' && !enrollStatus.startsWith('failed') && (
              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
                <div className="bar" style={{
                  position: 'absolute',
                  width: '60%',
                  height: '100%',
                  background: 'var(--accent-gradient)',
                  borderRadius: '2px',
                  animation: 'loading-pulse 1.8s infinite ease-in-out'
                }}></div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
              {enrollStatus === 'success' || enrollStatus.startsWith('failed') ? (
                <button 
                  className="btn-primary" 
                  onClick={() => {
                    setIsScanning(false);
                    setEnrollStatus('idle');
                  }}
                  style={{ width: '100%' }}
                >
                  Close Scan Panel
                </button>
              ) : (
                <button 
                  className="btn-danger" 
                  onClick={cancelEnrollment}
                  style={{ width: '100%' }}
                >
                  Cancel Enrollment Scan
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Embedded Animations for loading steps */}
      <style>{`
        @keyframes loading-pulse {
          0% { left: -60%; }
          100% { left: 100%; }
        }
        .animate-spin {
          animation: spin 1s infinite linear;
        }
        .animate-pulse {
          animation: pulse-ring 2s infinite ease-in-out;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; filter: drop-shadow(0 0 10px var(--accent)); }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
      `}</style>
    </>
  );
}
