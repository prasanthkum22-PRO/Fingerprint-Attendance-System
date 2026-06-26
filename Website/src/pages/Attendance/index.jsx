import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { 
  Calendar, 
  Search, 
  Filter, 
  CalendarCheck,
  UserCheck
} from 'lucide-react';

export default function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [students, setStudents] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');

  useEffect(() => {
    // 1. Fetch student mapping
    const studentsRef = ref(database, 'students');
    onValue(studentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const studentMap = {};
        Object.values(data).forEach(student => {
          studentMap[student.fingerprint_id] = {
            name: student.name,
            roll_no: student.roll_no
          };
        });
        setStudents(studentMap);
      }
    });

    // 2. Fetch full attendance records
    const attendanceRef = ref(database, 'attendance');
    onValue(attendanceRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const records = [];
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

                records.push({
                  key: pushId,
                  id: fingerprintId,
                  timestamp: ms,
                  status: record.status || 'Present'
                });
              }
            });
          }
        });
        
        // Sort newest first
        records.sort((a, b) => b.timestamp - a.timestamp);
        setAttendance(records);
      } else {
        setAttendance([]);
      }
    });
  }, []);

  // Filter logic
  const filteredAttendance = attendance.filter(record => {
    const student = students[record.id] || { name: `Unknown (ID: ${record.id})`, roll_no: 'N/A' };
    
    // 1. Search Query Filter
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.roll_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(record.id).includes(searchQuery);
    
    // 2. Date Filter
    let matchesDate = true;
    if (selectedDate) {
      let recordDateStr = '';
      if (record.timestamp > 0) {
        const d = new Date(record.timestamp);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        recordDateStr = `${y}-${m}-${day}`;
      }
      matchesDate = recordDateStr === selectedDate;
    }

    // 3. Status Filter
    let matchesStatus = true;
    if (selectedStatus !== 'All') {
      matchesStatus = record.status.toLowerCase() === selectedStatus.toLowerCase();
    }

    return matchesSearch && matchesDate && matchesStatus;
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Attendance Logs</h1>
          <p>Chronological feed of all fingerprint check-ins registered in the database.</p>
        </div>
      </div>

      {/* Filters Dashboard Card */}
      <div className="dashboard-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Filter size={18} style={{ color: 'var(--accent)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Filter & Search Logs</h3>
        </div>

        <div className="form-grid">
          {/* Search query */}
          <div className="form-group">
            <label>Search Student</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search name, roll no..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          {/* Date Picker */}
          <div className="form-group">
            <label>Specific Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} />
              <input 
                type="date" 
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          {/* Status select */}
          <div className="form-group">
            <label>Check-in Status</label>
            <select 
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
            </select>
          </div>

          {/* Reset Filters */}
          <button 
            className="btn-danger" 
            onClick={() => {
              setSearchQuery('');
              setSelectedDate('');
              setSelectedStatus('All');
            }}
            style={{ width: '100%' }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="dashboard-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarCheck size={20} style={{ color: 'var(--accent)' }} /> Full Attendance Logs
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing {filteredAttendance.length} records
          </span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fingerprint ID</th>
                <th>Student Name</th>
                <th>Roll No</th>
                <th>Time</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                    No check-in logs match the selected filter query.
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((record) => {
                  const logDate = record.timestamp > 0 ? new Date(record.timestamp).toLocaleDateString() : 'N/A';
                  const logTime = record.timestamp > 0 ? new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
                  const student = students[record.id] || { name: `Unknown Student`, roll_no: 'N/A' };
                  
                  return (
                    <tr key={`${record.key}-${record.timestamp}-${record.id}`}>
                      <td style={{ fontWeight: '600' }}>#{record.id}</td>
                      <td style={{ color: 'var(--text-main)', fontWeight: '500' }}>{student.name}</td>
                      <td>{student.roll_no}</td>
                      <td>{logTime}</td>
                      <td>{logDate}</td>
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
    </>
  );
}
