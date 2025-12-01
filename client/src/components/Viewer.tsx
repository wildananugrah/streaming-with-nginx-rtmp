import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface ViewerProps {
  streamUrl: string;
  onBack: () => void;
}

export function Viewer({ streamUrl, onBack }: ViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [status, setStatus] = useState<'connecting' | 'playing' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus('playing');
        video.play().catch(console.error);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setStatus('error');
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setErrorMessage('Network error - stream may not be available');
              // Try to recover
              setTimeout(() => hls.startLoad(), 3000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setErrorMessage('Media error - trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              setErrorMessage('Fatal error: ' + data.details);
              break;
          }
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setStatus('playing');
        video.play().catch(console.error);
      });
    } else {
      setStatus('error');
      setErrorMessage('HLS is not supported in this browser');
    }
  }, [streamUrl]);

  return (
    <div className="viewer-container">
      <div className="header">
        <button onClick={onBack} className="back-btn">
          ← Back
        </button>
        <h2>Watching Stream</h2>
        <span className={`status ${status}`}>
          {status === 'connecting' && '🔄 Connecting...'}
          {status === 'playing' && '🟢 Live'}
          {status === 'error' && '🔴 Error'}
        </span>
      </div>

      <div className="video-wrapper">
        <video
          ref={videoRef}
          controls
          autoPlay
          playsInline
          className="video-player"
        />
      </div>

      {status === 'error' && (
        <div className="error-message">
          <p>{errorMessage}</p>
          <p className="hint">Make sure the stream is active at: {streamUrl}</p>
        </div>
      )}

      <div className="stream-info">
        <p><strong>Stream URL:</strong> {streamUrl}</p>
      </div>
    </div>
  );
}
