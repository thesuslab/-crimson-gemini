import React, { useEffect, useState, useRef, useCallback } from 'react';
import LiveView from './components/LiveView';
import Overlay from './components/Overlay';
import './App.css';

interface VideoDevice {
  deviceId: string;
  label: string;
}

import type { LiveViewHandle } from './components/LiveView';

function App() {
  console.log("App component mounting...");
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [overlayImage, setOverlayImage] = useState<string>('');
  const liveViewRef = useRef<LiveViewHandle>(null);

  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true }); // Request permission
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(device => device.kind === 'videoinput');

        setDevices(videoDevices.map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${d.deviceId.slice(0, 5)}...`
        })));

        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Error listing devices:", err);
      }
    };

    getDevices();
  }, []);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setOverlayImage(url);
    }
  };

  const [snapStatus, setSnapStatus] = useState<string>('');

  // Composites video frame + overlay into a single PNG data URL
  const compositeWithOverlay = (videoDataUrl: string, overlayUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const videoImg = new Image();
      videoImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = videoImg.width;
        canvas.height = videoImg.height;
        const ctx = canvas.getContext('2d')!;
        // Draw video frame
        ctx.drawImage(videoImg, 0, 0);
        // Draw overlay on top, stretched to fill
        const overlayImg = new Image();
        overlayImg.onload = () => {
          ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        };
        overlayImg.onerror = () => resolve(canvas.toDataURL('image/png')); // save without overlay on error
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

      // Composite overlay on top if one is loaded
      if (overlayImage) {
        dataUrl = await compositeWithOverlay(dataUrl, overlayImage);
      }

      if (window.api && window.api.savePhoto) {
        const result = await window.api.savePhoto(dataUrl);
        setSnapStatus(result.success ? `Saved ✓` : `Save failed`);
      } else {
        setSnapStatus('API not available');
      }
    } catch (err: any) {
      console.error('Snap error:', err);
      setSnapStatus(`Error: ${err.message}`);
    }

    // Trigger physical shutter (fire and forget)
    if (window.api && window.api.triggerShutter) {
      window.api.triggerShutter().catch(console.error);
    }
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

        <div className="control-group">
          <label>Camera Source:</label>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
          >
            {devices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Overlay Image:</label>
          <input type="file" accept="image/png, image/jpeg" onChange={handleFileChange} />
        </div>

        <div className="control-group">
          <button className="shutter-btn" onClick={handleSnap}>SNAP PHOTO</button>
          {snapStatus && <p style={{ fontSize: '0.8em', marginTop: 4, wordBreak: 'break-all' }}>{snapStatus}</p>}
        </div>
      </div>
    </div>
  );
}

export default App;
