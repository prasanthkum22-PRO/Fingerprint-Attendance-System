import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { 
  Download, 
  TrendingUp, 
  Award, 
  CalendarRange, 
  FileSpreadsheet 
} from 'lucide-react';

export default function Reports() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({
    workingDays: 0,
    averageAttendance: 0,
    topPerformer: 'N/A'
  });

  useEffect(() => {
    // 1. Fetch students
    const studentsRef = ref(database, 'students');
    onValue(studentsRef, (snapshot) => {
      const studentVal = snapshot.val() || {};
      const studentList = Object.keys(studentVal).map(key => ({
        key,
        ...studentVal[key]
      }));
      setStudents(studentList);
    });

    // 2. Fetch attendance
    const attendanceRef = ref(database, 'attendance');
    onValue(attendanceRef, (snapshot) => {
      const attendanceVal = snapshot.val() || {};
      const recordList = [];
      
      Object.keys(attendanceVal).forEach(fingerprintId => {
        if (isNaN(parseInt(fingerprintId))) return; // Skip invalid non-numeric fingerprint IDs (like date_string mock)
        
        const studentLogs = attendanceVal[fingerprintId];
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

              recordList.push({
                fingerprintId: parseInt(fingerprintId),
                timestamp: ms
              });
            }
          });
        }
      });
      setAttendance(recordList);
    });
  }, []);

  // 3. Compile report data when students or attendance changes
  useEffect(() => {
    if (students.length === 0) {
      setReportData([]);
      setSummary({ workingDays: 0, averageAttendance: 0, topPerformer: 'N/A' });
      return;
    }

    // Determine total active working days (unique calendar dates across all scans)
    const uniqueDates = new Set();
    attendance.forEach(log => {
      if (log.timestamp && log.timestamp > 0) {
        const dateStr = new Date(log.timestamp).toDateString();
        uniqueDates.add(dateStr);
      }
    });
    const totalWorkingDays = uniqueDates.size || 1; // Fallback to 1 to avoid divide-by-zero

    // Calculate details for each student
    const compilation = students.map(student => {
      // Find all scans for this student
      const studentScans = attendance.filter(log => log.fingerprintId === student.fingerprint_id);
      
      // Calculate unique dates present
      const presentDates = new Set();
      studentScans.forEach(log => {
        if (log.timestamp && log.timestamp > 0) {
          presentDates.add(new Date(log.timestamp).toDateString());
        }
      });
      
      const daysPresent = presentDates.size;
      const rate = Math.round((daysPresent / totalWorkingDays) * 100);

      return {
        id: student.fingerprint_id,
        name: student.name,
        rollNo: student.roll_no || 'N/A',
        totalScans: studentScans.length,
        daysPresent: daysPresent,
        attendanceRate: rate
      };
    });

    setReportData(compilation);

    // Calculate Summary Metrics
    let totalRateSum = 0;
    let topRate = -1;
    let topStudentName = 'N/A';

    compilation.forEach(row => {
      totalRateSum += row.attendanceRate;
      if (row.attendanceRate > topRate) {
        topRate = row.attendanceRate;
        topStudentName = row.name;
      }
    });

    const averageRate = compilation.length > 0 ? Math.round(totalRateSum / compilation.length) : 0;

    setSummary({
      workingDays: uniqueDates.size,
      averageAttendance: averageRate,
      topPerformer: topRate > 0 ? `${topStudentName} (${topRate}%)` : 'N/A'
    });

  }, [students, attendance]);

  // Export to CSV Function
  const exportToCSV = () => {
    if (reportData.length === 0) {
      alert("No data available to export.");
      return;
    }

    // CSV Headers
    const headers = ["Fingerprint ID", "Student Name", "Roll Number", "Total Scans", "Days Present", "Attendance Rate (%)"];
    
    // Convert rows
    const rows = reportData.map(row => [
      row.id,
      `"${row.name.replace(/"/g, '""')}"`, // escape quotes
      `"${row.rollNo.replace(/"/g, '""')}"`,
      row.totalScans,
      row.daysPresent,
      row.attendanceRate
    ]);

    // Build file contents
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    // Download element trigger
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Attendance Reports</h1>
          <p>Analyze performance metrics, compile rates, and download reports.</p>
        </div>
        <button className="btn-primary" onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={16} /> Export CSV Report
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="stats-grid">
        <div className="dashboard-card stat-card">
          <div className="stat-icon">
            <CalendarRange size={24} />
          </div>
          <div className="stat-details">
            <h3>Active Working Days</h3>
            <div className="value">{summary.workingDays}</div>
          </div>
        </div>

        <div className="dashboard-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)', borderColor: 'rgba(99, 102, 241, 0.15)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-details">
            <h3>Average Attendance Rate</h3>
            <div className="value">{summary.averageAttendance}%</div>
          </div>
        </div>

        <div className="dashboard-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', borderColor: 'rgba(245, 158, 11, 0.15)' }}>
            <Award size={24} />
          </div>
          <div className="stat-details">
            <h3>Top Performer</h3>
            <div className="value" style={{ fontSize: '1.2rem', marginTop: '10px' }}>{summary.topPerformer}</div>
          </div>
        </div>
      </div>

      {/* Reports Table Sheet */}
      <div className="dashboard-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={20} style={{ color: 'var(--accent)' }} /> Compiled Student Ledger
          </h2>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fingerprint ID</th>
                <th>Student Name</th>
                <th>Roll No</th>
                <th>Total Scans</th>
                <th>Days Present</th>
                <th>Attendance Rate</th>
              </tr>
            </thead>
            <tbody>
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                    No student records found to compile ledger.
                  </td>
                </tr>
              ) : (
                reportData.map((row) => {
                  let badgeClass = 'absent';
                  if (row.attendanceRate >= 80) badgeClass = 'present';
                  else if (row.attendanceRate >= 50) badgeClass = 'late';
                  
                  return (
                    <tr key={row.id}>
                      <td style={{ fontWeight: '600' }}>#{row.id}</td>
                      <td style={{ color: 'var(--text-main)', fontWeight: '500' }}>{row.name}</td>
                      <td>{row.rollNo}</td>
                      <td>{row.totalScans}</td>
                      <td>{row.daysPresent} / {summary.workingDays}</td>
                      <td>
                        <span className={`status-badge ${badgeClass}`}>
                          {row.attendanceRate}%
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
