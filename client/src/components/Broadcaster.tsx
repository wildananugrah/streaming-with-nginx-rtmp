import { useEffect, useRef, useState } from 'react';

interface BroadcasterProps {
  streamKey: string;
  rtmpServer: string;
  onBack: () => void;
}

type SourceType = 'camera' | 'screen';

export function Broadcaster({ streamKey, rtmpServer, onBack }: BroadcasterProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [sourceType, setSourceType] = useState<SourceType>('camera');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');

  // Get camera or screen stream
  const startCapture = async (type: SourceType) => {
    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      let mediaStream: MediaStream;

      if (type === 'camera') {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: true,
        });
      } else {
        mediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
          audio: true,
        });
      }

      setStream(mediaStream);
      setSourceType(type);
      setError('');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError(`Failed to access ${type}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Stop capture
  const stopCapture = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsStreaming(false);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Generate FFmpeg command for the user
  const ffmpegCommand = `ffmpeg -f avfoundation -framerate 30 -i "0:0" \\
    -c:v libx264 -preset ultrafast -b:v 1500k \\
    -c:a aac -b:a 128k \\
    -f flv ${rtmpServer}/stream/${streamKey}`;

  const obsSettings = {
    server: `${rtmpServer}/stream`,
    streamKey: streamKey,
  };

  return (
    <div className="broadcaster-container">
      <div className="header">
        <button onClick={onBack} className="back-btn">
          ← Back
        </button>
        <h2>Broadcaster</h2>
        <span className={`status ${stream ? 'active' : 'inactive'}`}>
          {stream ? '🟢 Capturing' : '⚪ Not capturing'}
        </span>
      </div>

      <div className="video-wrapper">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="video-player mirror"
        />
        {!stream && (
          <div className="video-placeholder">
            <p>Select a source to start preview</p>
          </div>
        )}
      </div>

      <div className="controls">
        <div className="source-buttons">
          <button
            onClick={() => startCapture('camera')}
            className={`btn ${sourceType === 'camera' && stream ? 'active' : ''}`}
          >
            📷 Camera
          </button>
          <button
            onClick={() => startCapture('screen')}
            className={`btn ${sourceType === 'screen' && stream ? 'active' : ''}`}
          >
            🖥️ Screen Share
          </button>
          {stream && (
            <button onClick={stopCapture} className="btn btn-danger">
              ⏹️ Stop
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="stream-instructions">
        <h3>How to Broadcast</h3>
        <p className="note">
          Browser-to-RTMP streaming requires a media server or external tool.
          Use one of these methods:
        </p>

        <div className="method">
          <h4>Option 1: OBS Studio (Recommended)</h4>
          <table>
            <tbody>
              <tr>
                <td><strong>Server:</strong></td>
                <td><code>{obsSettings.server}</code></td>
              </tr>
              <tr>
                <td><strong>Stream Key:</strong></td>
                <td><code>{obsSettings.streamKey}</code></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="method">
          <h4>Option 2: FFmpeg (Command Line)</h4>
          <pre className="code-block">{ffmpegCommand}</pre>
          <button
            onClick={() => navigator.clipboard.writeText(ffmpegCommand)}
            className="btn btn-small"
          >
            📋 Copy Command
          </button>
        </div>

        <div className="method">
          <h4>Option 3: Test Stream (FFmpeg)</h4>
          <pre className="code-block">{`ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 \\
    -f lavfi -i sine=frequency=1000 \\
    -c:v libx264 -preset ultrafast -b:v 1500k \\
    -c:a aac -b:a 128k \\
    -f flv ${rtmpServer}/stream/${streamKey}`}</pre>
          <button
            onClick={() => navigator.clipboard.writeText(
              `ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 -f lavfi -i sine=frequency=1000 -c:v libx264 -preset ultrafast -b:v 1500k -c:a aac -b:a 128k -f flv ${rtmpServer}/stream/${streamKey}`
            )}
            className="btn btn-small"
          >
            📋 Copy Command
          </button>
        </div>
      </div>

      <div className="viewer-link">
        <h4>Share with viewers:</h4>
        <code>{`${window.location.origin}?watch=${streamKey}`}</code>
        <button
          onClick={() => navigator.clipboard.writeText(`${window.location.origin}?watch=${streamKey}`)}
          className="btn btn-small"
        >
          📋 Copy Link
        </button>
      </div>
    </div>
  );
}
