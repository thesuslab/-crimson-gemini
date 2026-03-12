import React, { useEffect, useState, useRef, useCallback } from 'react';
import LiveView from './components/LiveView';
import Overlay from './components/Overlay';
import type { LiveViewHandle } from './components/LiveView';
import './App.css';

interface VideoDevice {
  deviceId: string;
  label: string;
}

function App() {
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [overlayImage, setOverlayImage] = useState<string>('');
  const [saveDir, setSaveDir] = useState<string>('');
  const [resolution, setResolution] = useState<{ width: number; height: number } | null>(null);
  const [snapStatus, setSnapStatus] = useState<string>('');
  const liveViewRef = useRef<LiveViewHandle>(null);

  // Load initial save directory
  useEffect(() => {
    if (window.api?.getSaveDir) {
      window.api.getSaveDir().then(r => setSaveDir(r.dir));
    }
  }, []);

  // Enumerate cameras
  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
        setDevices(videoDevices.map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${d.deviceId.slice(0, 5)}...`
        })));
        if (videoDevices.length > 0) setSelectedDeviceId(videoDevices[0].deviceId);
      } catch (err) {
        console.error('Error listing devices:', err);
      }
    };
    getDevices();
  }, []);

  // Poll resolution from video stream every second
  useEffect(() => {
    const interval = setInterval(() => {
      const res = liveViewRef.current?.getResolution();
      if (res) setResolution(res);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setOverlayImage(URL.createObjectURL(file));
  };

  const handleChooseSaveDir = async () => {
    if (window.api?.chooseSaveDir) {
      const result = await window.api.chooseSaveDir();
      setSaveDir(result.dir);
    }
  };

  const compositeWithOverlay = (videoDataUrl: string, overlayUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const videoImg = new Image();
      videoImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = videoImg.width;
        canvas.height = videoImg.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(videoImg, 0, 0);
        const overlayImg = new Image();
        overlayImg.onload = () => {
          ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        };
        overlayImg.onerror = () => resolve(canvas.toDataURL('image/png'));
        overlayImg.src = overlayUrl;
      };
      videoImg.src = videoDataUrl;
    });
  };

  const handleSnap = useCallback(async () => {
    setSnapStatus('Saving...');
    try {
      if (!liveViewRef.current) { setSnapStatus('No video source'); return; }
      let dataUrl = liveViewRef.current.captureFrame();
      if (!dataUrl) { setSnapStatus('Could not capture frame'); return; }
      if (overlayImage) dataUrl = await compositeWithOverlay(dataUrl, overlayImage);
      if (window.api?.savePhoto) {
        const result = await window.api.savePhoto(dataUrl);
        setSnapStatus(result.success ? 'Saved ✓' : 'Save failed');
      } else {
        setSnapStatus('API not available');
      }
    } catch (err: any) {
      setSnapStatus(`Error: ${err.message}`);
    }
    window.api?.triggerShutter().catch(console.error);
  }, [overlayImage, liveViewRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleSnap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSnap]);

  return (
    <div className="app-container">
      <div className="main-content">
        <LiveView ref={liveViewRef} deviceId={selectedDeviceId} />
        <Overlay imageUrl={overlayImage} />
      </div>

      <div className="controls-panel">
        <h2>Settings</h2>

        {/* Camera source */}
        <div className="control-group">
          <label>Camera Source:</label>
          <select value={selectedDeviceId} onChange={(e) => setSelectedDeviceId(e.target.value)}>
            {devices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
            ))}
          </select>
        </div>

        {/* Overlay image */}
        <div className="control-group">
          <label>Overlay Image:</label>
          <input type="file" accept="image/png, image/jpeg" onChange={handleFileChange} />
        </div>

        {/* Save folder */}
        <div className="control-group">
          <label>Save Folder:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.75em', wordBreak: 'break-all', flex: 1, opacity: 0.8 }}>
              {saveDir || 'Pictures (default)'}
            </span>
            <button onClick={handleChooseSaveDir} style={{ whiteSpace: 'nowrap' }}>Browse…</button>
          </div>
        </div>

        {/* Info panel */}
        <div className="control-group info-panel">
          <label>📷 Camera Info</label>
          {resolution ? (
            <div style={{ fontSize: '0.8em', lineHeight: 1.6, marginTop: 4 }}>
              <div>Resolution: <strong>{resolution.width} × {resolution.height} px</strong></div>
              <div style={{ opacity: 0.75 }}>
                Use an overlay image of exactly <strong>{resolution.width} × {resolution.height} px</strong> (PNG with transparency) for a perfect fit.
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.8em', opacity: 0.6, marginTop: 4 }}>
              Waiting for video stream…
            </div>
          )}
        </div>

        {/* Snap button */}
        <div className="control-group">
          <button className="shutter-btn" onClick={handleSnap}>SNAP PHOTO</button>
          <div style={{ fontSize: '0.75em', opacity: 0.6, marginTop: 2 }}>or press Space / Enter</div>
          {snapStatus && <p style={{ fontSize: '0.8em', marginTop: 4, wordBreak: 'break-all' }}>{snapStatus}</p>}
        </div>
      </div>
    </div>
  );
}

export default App;
