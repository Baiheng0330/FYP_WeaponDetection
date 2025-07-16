import * as React from 'react';
import { useEffect, useState } from 'react';

const BACKEND_URL = 'http://localhost:8000';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

const Dashboard: React.FC = () => {
  const [tab, setTab] = useState<'live' | 'incidents'>('live');
  const [alertCount, setAlertCount] = useState(0);
  const [clock, setClock] = useState('');
  const [mounted, setMounted] = useState(false);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [modalImg, setModalImg] = useState<string | null>(null);
  const [camName, setCamName] = useState('Main Entrance');
  const [camLocation, setCamLocation] = useState('Building A - Front');
  const [videoError, setVideoError] = useState(false);
  const [videoTimestamp, setVideoTimestamp] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Real-time clock
  useEffect(() => {
    setMounted(true);
    setVideoTimestamp(Date.now()); // Set initial timestamp after mount
    const interval = setInterval(() => {
      setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch alert count
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/alerts`);
        const data = await res.json();
        setAlertCount(data.alerts || 0);
      } catch {}
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch incidents (auto-refresh)
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/incidents`);
        const data = await res.json();
        setIncidents(data);
        if (data.length > 0) {
          setCamName(data[0].camera_name || 'Main Entrance');
          setCamLocation(data[0].location || 'Building A - Front');
        }
      } catch {}
    };
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch notification settings
  useEffect(() => {
    const fetchNotificationSettings = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/settings/notifications`);
        const data = await res.json();
        setNotificationsEnabled(data.enabled || false);
      } catch {}
    };
    fetchNotificationSettings();
  }, []);

  // Tab switch handler for camera link
  const handleCameraClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setTab('live');
  };

  // Video error handler
  const handleVideoError = () => {
    setVideoError(true);
    setTimeout(() => {
      setVideoError(false)
      setVideoTimestamp(Date.now()) // Update timestamp on retry
    }, 5000); // Retry after 5 seconds
  };

  const handleVideoLoad = () => {
    setVideoError(false);
  };

  const handleNotificationToggle = async () => {
    const newEnabled = !notificationsEnabled;
    try {
      const res = await fetch(`${BACKEND_URL}/settings/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: newEnabled }),
      });
      
      if (res.ok) {
        setNotificationsEnabled(newEnabled);
      }
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#151c28] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-[#22304a]">
        <div className="text-3xl font-bold flex items-center">
          <span className="mr-3">🛡️ Security Command Center</span>
        </div>
        <div>
          <span className="rounded-full px-4 py-1 font-semibold text-[#a68b00] bg-[#fff7c2] text-lg">
            {alertCount} Alerts
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 px-8 pt-6">
        <button
          className={classNames(
            'px-6 py-2 rounded-t-lg font-semibold',
            tab === 'live' ? 'bg-[#2563eb] text-white' : 'bg-[#22304a] text-[#b0b8c9]'
          )}
          onClick={() => setTab('live')}
        >
          Live Camera Feed
        </button>
        <button
          className={classNames(
            'px-6 py-2 rounded-t-lg font-semibold',
            tab === 'incidents' ? 'bg-[#2563eb] text-white' : 'bg-[#22304a] text-[#b0b8c9]'
          )}
          onClick={() => setTab('incidents')}
        >
          Incidents Dashboard
        </button>
      </div>

      {/* Tab Content */}
      <div className="px-8 pb-8 pt-4">
        {tab === 'live' && (
          <div className="max-w-4xl mx-auto">
            {/* System Controls */}
            <div className="mb-6 bg-[#22304a] rounded-xl p-6">
              <div className="text-lg font-semibold mb-4">System Controls</div>
              <div className="flex items-center justify-between">
                <span className="text-[#b0b8c9]">Alert Notifications</span>
                <button
                  onClick={handleNotificationToggle}
                  className={classNames(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    notificationsEnabled ? 'bg-[#2563eb]' : 'bg-[#374151]'
                  )}
                >
                  <span
                    className={classNames(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            </div>
            {/* Real-time clock */}
            <div className="text-center text-2xl mb-2">{mounted ? clock : null}</div>
            <div className="bg-[#22304a] rounded-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-2xl font-bold">{camName}</div>
                  <div className="text-[#b0b8c9]">{camLocation}</div>
                </div>
                <div className="text-[#ff6b6b] font-bold text-lg">● REC</div>
              </div>
              <div className="flex flex-col items-center justify-center" style={{ height: 350 }}>
                {!videoError && mounted ? (
                  <img
                    src={`${BACKEND_URL}/video?t=${videoTimestamp}`}
                    alt="Live Feed"
                    className="rounded-lg bg-black max-w-[80%]"
                    style={{ objectFit: 'contain', height: '100%' }}
                    onError={handleVideoError}
                    onLoad={handleVideoLoad}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center bg-black rounded-lg" style={{ height: '100%', width: '80%' }}>
                    <div className="text-[#ff6b6b] text-xl mb-4">📹</div>
                    <div className="text-white text-lg">{mounted ? "Camera Feed Unavailable" : "Loading..."}</div>
                    <div className="text-[#b0b8c9] text-sm mt-2">{mounted && videoError ? "Attempting to reconnect..." : ""}</div>
                  </div>
                )}
                <div className="mt-6 text-center text-[#b0b8c9]">
                  <div className="text-lg">Live Feed: {camName}</div>
                  <div>{videoError ? 'Connection Lost' : 'Stream Active'}</div>
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === 'incidents' && (
          <div>
            <div className="text-2xl font-bold mb-4">Security Incidents</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left incident-table border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="bg-[#22304a]">Alert Name</th>
                    <th className="bg-[#22304a]">Trigger Time</th>
                    <th className="bg-[#22304a]">Camera</th>
                    <th className="bg-[#22304a]">Location</th>
                    <th className="bg-[#22304a]">Clips</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-[#b0b8c9]">No incidents detected yet.</td>
                    </tr>
                  )}
                  {incidents.map((incident, idx) => {
                    const alertName = `${incident.label.charAt(0).toUpperCase() + incident.label.slice(1)} alert`;
                    const triggerTime = new Date(
                      incident.timestamp.replace(/_/g, ':').replace(/-/g, '/').replace(/\s/g, 'T')
                    );
                    const camera = incident.camera_name || incident.camera || 'Camera 1';
                    const location = incident.location || 'Building A - Front';
                    const imgUrl = `${BACKEND_URL}${incident.image}`;
                    return (
                      <tr key={incident.id} className="hover:bg-[#22304a]">
                        <td>{alertName}</td>
                        <td>{incident.timestamp.replace(/_/g, ':').replace(/-/g, '/')}</td>
                        <td>
                          <a
                            href="#"
                            className="text-[#60aaff] underline"
                            onClick={handleCameraClick}
                          >
                            {camera}
                          </a>
                        </td>
                        <td>{location}</td>
                        <td>
                          <img
                            src={imgUrl}
                            alt="clip"
                            className="w-16 h-16 rounded-lg bg-[#222] cursor-pointer hover:ring-2 hover:ring-[#2563eb]"
                            onClick={() => setModalImg(imgUrl)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal for enlarged image */}
      {modalImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" onClick={() => setModalImg(null)}>
          <img src={modalImg} alt="Enlarged clip" className="max-w-3xl max-h-[80vh] rounded-xl border-4 border-white" />
        </div>
      )}
    </div>
  );
};

export default Dashboard;