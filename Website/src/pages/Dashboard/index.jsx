import React, { useEffect, useState, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { 
  Users, 
  CheckCircle, 
  Activity, 
  Clock, 
  UserCheck,
  Terminal
} from 'lucide-react';

export default function Dashboard() {
  const [attendance, setAttendance] = useState([]);
  const [students, setStudents] = useState({});
  const [systemLogs, setSystemLogs] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeToday: 0,
    latestLogTime: 'N/A'
  });

  const consoleEndRef = useRef(null);

  // Auto-scroll the serial console to bottom on new log additions
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [systemLogs]);

  useEffect(() => {
    // 1. Fetch students
    const studentsRef = ref(database, 'students');
    onValue(studentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const studentMap = {};
        const studentList = Object.values(data);
        studentList.forEach(student => {
          studentMap[student.fingerprint_id] = student.name;
        });
        setStudents(studentMap);
        
        setStats(prev => ({
          ...prev,
          totalStudents: studentList.length
        }));
      } else {
        setStudents({});
        setStats(prev => ({ ...prev, totalStudents: 0 }));
      }
    });

    // 2. Fetch attendance records
    const attendanceRef = ref(database, 'attendance');
    onValue(attendanceRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const records = [];
        let todayCount = 0;
        let mostRecentTime = 0;
        const todayStr = new Date().toDateString();

        // Traverse attendance -> fingerprintID -> pushID -> {timestamp, status}
        Object.keys(data).forEach(fingerprintId => {
          if (isNaN(parseInt(fingerprintId))) return; // Skip invalid non-numeric fingerprint IDs (like date_string mock)
          
          const studentLogs = data[fingerprintId];
          if (studentLogs && typeof studentLogs === 'object') {
            Object.keys(studentLogs).forEach(pushId => {
              const record = studentLogs[pushId];
              if (record) {
                // Convert timestamp to ms safely
                let ms = Number(record.timestamp);
                if (isNaN(ms)) {
                  const parsed = Date.parse(record.timestamp);
                  ms = isNaN(parsed) ? 0 : parsed;
                }
                if (ms < 10000000000 && ms > 0) {
                  ms = ms * 1000;
                }
                
                // Track most recent log
                if (ms > mostRecentTime) {
                  mostRecentTime = ms;
                }

                // Check if today
                if (ms > 0 && new Date(ms).toDateString() === todayStr) {
                  todayCount++;
                }

                records.push({
                  id: fingerprintId,
                  timestamp: ms,
                  status: record.status || 'Present'
                });
              }
            });
          }
        });
        
        // Sort by timestamp descending
        records.sort((a, b) => b.timestamp - a.timestamp);
        
        // Take the 7 most recent logs for quick dashboard overview
        setAttendance(records.slice(0, 7));

        // Format latest scan time
        let latestScan = 'N/A';
        if (mostRecentTime > 0) {
          latestScan = new Date(mostRecentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        setStats(prev => ({
          ...prev,
          activeToday: todayCount,
          latestLogTime: latestScan
        }));
      } else {
        setAttendance([]);
        setStats(prev => ({ ...prev, activeToday: 0, latestLogTime: 'N/A' }));
      }
    });

    // 3. Fetch system logs
    const logsRef = ref(database, 'logs');
    onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const logList = Object.keys(data).map(key => ({
          key,
          ...data[key]
        }));
        // Sort by timestamp descending to get the newest logs first
        logList.sort((a, b) => b.timestamp - a.timestamp);
        // Take the top 15 (most recent logs)
        const recentLogs = logList.slice(0, 15);
        // Sort ascending so they are chronological (oldest to newest, with newest at the bottom)
        recentLogs.sort((a, b) => a.timestamp - b.timestamp);
        setSystemLogs(recentLogs);
      } else {
        setSystemLogs([]);
      }
    });
  }, []);

  return (
    <>
      {/* Header bar */}
      <div className="page-header">
        <div>
          <h1>Control Center Dashboard</h1>
          <p>Real-time system diagnostics and student attendance overview.</p>
        </div>
      </div>

      {/* Grid containing the status cards */}
      <div className="stats-grid">
        <div className="dashboard-card stat-card">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div className="stat-details">
            <h3>Registered Students</h3>
            <div className="value">{stats.totalStudents}</div>
          </div>
        </div>

        <div className="dashboard-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
            <UserCheck size={24} />
          </div>
          <div className="stat-details">
            <h3>Present Today</h3>
            <div className="value">{stats.activeToday}</div>
          </div>
        </div>

        <div className="dashboard-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', borderColor: 'rgba(245, 158, 11, 0.15)' }}>
            <Clock size={24} />
          </div>
          <div className="stat-details">
            <h3>Last Scan Activity</h3>
            <div className="value">{stats.latestLogTime}</div>
          </div>
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '30px' }}>
        
        {/* Left Side: Live Log Activity Board */}
        <div className="dashboard-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} style={{ color: 'var(--accent)' }} /> Recent Live Activity
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Auto-updating logs...</span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fingerprint ID</th>
                  <th>Student Name</th>
                  <th>Scan Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlignment: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                      No scan activity registered yet.
                    </td>
                  </tr>
                ) : (
                  attendance.map((record, index) => {
                    const logTime = record.timestamp > 0 ? new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
                    const studentName = students[record.id] || `Enrolled ID: ${record.id}`;
                    
                    return (
                      <tr key={index}>
                        <td style={{ fontWeight: '600' }}>#{record.id}</td>
                        <td style={{ color: 'var(--text-main)', fontWeight: '500' }}>{studentName}</td>
                        <td>{logTime}</td>
                        <td>
                          <span className={`status-badge ${record.status.toLowerCase()}`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Remote System Console Monitor */}
        <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={20} style={{ color: 'var(--accent)' }} /> Remote Hardware Serial Console
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Device streams...</span>
          </div>

          <div style={{
            background: '#04060d',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            padding: '20px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '0.85rem',
            color: '#34d399',
            flexGrow: 1,
            minHeight: '260px',
            maxHeight: '340px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
            textAlign: 'left'
          }}>
            {systemLogs.length === 0 ? (
              <div style={{ color: 'var(--text-dark)' }}>&gt; Idle. Waiting for hardware debug events...</div>
            ) : (
              <>
                {systemLogs.map((log) => {
                  const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '00:00:00';
                  return (
                    <div key={log.key} style={{ display: 'flex', gap: '10px', lineHeight: '1.4' }}>
                      <span style={{ color: 'var(--text-muted)', userSelect: 'none' }}>[{timeStr}]</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>&gt;</span>
                      <span style={{ color: '#f3f4f6' }}>{log.message}</span>
                    </div>
                  );
                })}
                <div ref={consoleEndRef} />
              </>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
