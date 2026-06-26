import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  FileSpreadsheet, 
  Settings,
  ShieldAlert,
  Wifi,
  Cpu
} from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { database } from './firebaseConfig';

import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';
import AdminLogin from './pages/AdminLogin';

function App() {
  const [deviceActive, setDeviceActive] = useState(false);

  useEffect(() => {
    // Check if ESP32 attendance has recent logs to determine online status
    const attendanceRef = ref(database, 'attendance');
    onValue(attendanceRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Look at the latest timestamp across all students
        let latestTime = 0;
        Object.values(data).forEach(studentLogs => {
          if (studentLogs && typeof studentLogs === 'object') {
            Object.values(studentLogs).forEach(log => {
              if (log.timestamp && log.timestamp > latestTime) {
                latestTime = log.timestamp;
              }
            });
          }
        });
        
        // If the latest log was within 5 minutes, consider device active
        const now = Date.now();
        if (latestTime > 0 && (now - latestTime < 5 * 60 * 1000)) {
          setDeviceActive(true);
        } else {
          setDeviceActive(false);
        }
      }
    });
  }, []);

  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Navigation Sidebar */}
        <nav className="sidebar">
          <h2>BioSync Admin</h2>
          <ul>
            <li>
              <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
                <LayoutDashboard size={20} />
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/students" className={({ isActive }) => isActive ? 'active' : ''}>
                <Users size={20} />
                Students
              </NavLink>
            </li>
            <li>
              <NavLink to="/attendance" className={({ isActive }) => isActive ? 'active' : ''}>
                <CalendarCheck size={20} />
                Attendance
              </NavLink>
            </li>
            <li>
              <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>
                <FileSpreadsheet size={20} />
                Reports
              </NavLink>
            </li>
            <li>
              <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
                <Settings size={20} />
                Settings
              </NavLink>
            </li>
          </ul>

          <div style={{ marginTop: 'auto', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={14} /> System Node: ESP32
            </span>
            <div className={deviceActive ? 'device-active' : ''} style={{ fontSize: '0.85rem', color: deviceActive ? 'var(--color-success)' : 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {!deviceActive && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-dark)' }}></div>}
              {deviceActive ? 'Sensor Connected' : 'Sensor Offline'}
            </div>
          </div>
        </nav>

        {/* Workspace Panels */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/login" element={<AdminLogin />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
