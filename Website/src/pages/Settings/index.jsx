import React, { useEffect, useState } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { 
  Sliders, 
  Database, 
  HelpCircle, 
  Cpu, 
  Volume2, 
  VolumeX, 
  Save 
} from 'lucide-react';

export default function Settings() {
  const [dbSettings, setDbSettings] = useState({
    buzzerDuration: 200,
    buzzerEnabled: true,
    sensorMatchThreshold: 50
  });

  useEffect(() => {
    const settingsRef = ref(database, 'settings');
    onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setDbSettings({
          buzzerDuration: data.buzzer_duration || 200,
          buzzerEnabled: data.buzzer_enabled !== undefined ? data.buzzer_enabled : true,
          sensorMatchThreshold: data.match_threshold || 50
        });
      }
    });
  }, []);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    const settingsRef = ref(database, 'settings');
    set(settingsRef, {
      buzzer_duration: parseInt(dbSettings.buzzerDuration),
      buzzer_enabled: dbSettings.buzzerEnabled,
      match_threshold: parseInt(dbSettings.sensorMatchThreshold)
    }).then(() => {
      alert("Settings updated in database! The ESP32 will synchronize them on next boot.");
    }).catch((error) => {
      alert("Failed to update settings: " + error.message);
    });
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>System Settings</h1>
          <p>Configure hardware parameters, browse network details, and view device wiring layouts.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
        
        {/* Left Side: Firmware Adjustments */}
        <div className="dashboard-card" style={{ height: 'fit-content' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Sliders size={20} style={{ color: 'var(--accent)' }} /> Device Sync Settings
          </h2>
          
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Volume2 size={16} /> Buzzer Duration (ms)
              </label>
              <input 
                type="number" 
                min="50"
                max="2000"
                value={dbSettings.buzzerDuration} 
                onChange={e => setDbSettings({...dbSettings, buzzerDuration: e.target.value})} 
                required 
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Duration of beep sound on successful checks.</span>
            </div>

            <div className="form-group" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '0px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                {dbSettings.buzzerEnabled ? <Volume2 size={16} /> : <VolumeX size={16} style={{ color: 'var(--color-danger)' }} />}
                Audible Feedback Beeps
              </label>
              <input 
                type="checkbox" 
                checked={dbSettings.buzzerEnabled} 
                onChange={e => setDbSettings({...dbSettings, buzzerEnabled: e.target.checked})} 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            <div className="form-group">
              <label>Match Confidence Threshold</label>
              <select 
                value={dbSettings.sensorMatchThreshold} 
                onChange={e => setDbSettings({...dbSettings, sensorMatchThreshold: e.target.value})}
              >
                <option value="35">Low Sensitivity (Fast, Less Secure)</option>
                <option value="50">Medium Sensitivity (Recommended)</option>
                <option value="75">High Sensitivity (Secure, Strict)</option>
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Minimum confidence score required for check-in.</span>
            </div>

            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Save size={16} /> Save Hardware Sync Settings
            </button>
          </form>
        </div>

        {/* Right Side: Network Info & Wiring Layout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Card: Firebase API info */}
          <div className="dashboard-card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
              <Database size={20} style={{ color: 'var(--accent)' }} /> Database Diagnostics
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Realtime DB Node:</strong>
                <code style={{ marginLeft: '10px' }}>finger-attendance--esp-32-default-rtdb</code>
              </div>
              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Host Region:</strong>
                <code style={{ marginLeft: '10px' }}>Asia-Southeast (Singapore)</code>
              </div>
              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Network Protocol:</strong>
                <span style={{ marginLeft: '10px', color: 'var(--color-success)', fontWeight: '600' }}>WSS / SSL Encrypted</span>
              </div>
            </div>
          </div>

          {/* Card: Wiring details */}
          <div className="dashboard-card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
              <Cpu size={20} style={{ color: 'var(--accent)' }} /> ESP32 Wiring Schema
            </h2>
            <div className="table-container">
              <table style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>ESP32 Pin</th>
                    <th>Connection Type</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Fingerprint Sensor RX</td>
                    <td><strong style={{ color: 'var(--text-main)' }}>TX2 (GPIO 17)</strong></td>
                    <td>Serial UART Connection</td>
                  </tr>
                  <tr>
                    <td>Fingerprint Sensor TX</td>
                    <td><strong style={{ color: 'var(--text-main)' }}>RX2 (GPIO 16)</strong></td>
                    <td>Serial UART Connection</td>
                  </tr>
                  <tr>
                    <td>Green Status LED</td>
                    <td><strong style={{ color: 'var(--text-main)' }}>GPIO 2</strong></td>
                    <td>Analog Out / Indicator</td>
                  </tr>
                  <tr>
                    <td>Audible Buzzer</td>
                    <td><strong style={{ color: 'var(--text-main)' }}>GPIO 4</strong></td>
                    <td>Digital High / Beep Out</td>
                  </tr>
                  <tr>
                    <td>Enroll Push Button</td>
                    <td><strong style={{ color: 'var(--text-main)' }}>GPIO 5</strong></td>
                    <td>Input Pull-up Trigger</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </>
  );
}
