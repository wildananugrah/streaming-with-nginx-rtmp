import { useState, useEffect } from 'react';
import { Viewer } from './components/Viewer';
import { Broadcaster } from './components/Broadcaster';
import './App.css';

type Role = 'select' | 'broadcaster' | 'viewer';

// Configure from .env
const CONFIG = {
  rtmpServer: import.meta.env.VITE_RTMP_SERVER || 'rtmp://localhost',
  // Use proxy in dev mode (requests to /hls are proxied to HLS server)
  hlsServer: import.meta.env.VITE_HLS_SERVER || 'http://localhost:8080'
};

function App() {
  const [role, setRole] = useState<Role>('select');
  const [streamKey, setStreamKey] = useState('test');
  const [inputStreamKey, setInputStreamKey] = useState('test');

  // Check URL params for direct viewer link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const watchKey = params.get('watch');
    if (watchKey) {
      setStreamKey(watchKey);
      setRole('viewer');
    }
  }, []);

  const handleStartViewing = () => {
    setStreamKey(inputStreamKey);
    setRole('viewer');
  };

  const handleStartBroadcasting = () => {
    setStreamKey(inputStreamKey);
    setRole('broadcaster');
  };

  const handleBack = () => {
    setRole('select');
    // Clear URL params
    window.history.replaceState({}, '', window.location.pathname);
  };

  if (role === 'viewer') {
    return (
      <Viewer
        streamUrl={`${CONFIG.hlsServer}/hls/${streamKey}.m3u8`}
        onBack={handleBack}
      />
    );
  }

  if (role === 'broadcaster') {
    return (
      <Broadcaster
        streamKey={streamKey}
        rtmpServer={CONFIG.rtmpServer}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="app-container">
      <div className="hero">
        <h1>🎬 Live Streaming</h1>
        <p>Broadcast your content or watch live streams</p>
      </div>

      <div className="stream-key-input">
        <label htmlFor="streamKey">Stream Key / Channel Name</label>
        <input
          id="streamKey"
          type="text"
          value={inputStreamKey}
          onChange={(e) => setInputStreamKey(e.target.value)}
          placeholder="Enter stream key..."
        />
      </div>

      <div className="role-selection">
        <button
          onClick={handleStartBroadcasting}
          className="role-btn broadcaster"
          disabled={!inputStreamKey.trim()}
        >
          <span className="icon">📡</span>
          <span className="title">Broadcaster</span>
          <span className="desc">Start streaming to viewers</span>
        </button>

        <button
          onClick={handleStartViewing}
          className="role-btn viewer"
          disabled={!inputStreamKey.trim()}
        >
          <span className="icon">👁️</span>
          <span className="title">Viewer</span>
          <span className="desc">Watch a live stream</span>
        </button>
      </div>

      <div className="server-info">
        <h3>Server Configuration</h3>
        <table>
          <tbody>
            <tr>
              <td>RTMP Server:</td>
              <td><code>{CONFIG.rtmpServer}</code></td>
            </tr>
            <tr>
              <td>HLS Server:</td>
              <td><code>{CONFIG.hlsServer}</code></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
