import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import './LiveView.css';

interface LiveViewProps {
    deviceId: string;
}

export interface LiveViewHandle {
    captureFrame: () => string | null;
    getResolution: () => { width: number; height: number } | null;
}

const LiveView = forwardRef<LiveViewHandle, LiveViewProps>(({ deviceId }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(ref, () => ({
        captureFrame: () => {
            if (!videoRef.current) return null;
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                return canvas.toDataURL('image/png');
            }
            return null;
        },
        getResolution: () => {
            if (!videoRef.current || !videoRef.current.videoWidth) return null;
            return { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
        }
    }));

    useEffect(() => {
        let stream: MediaStream | null = null;

        const startStream = async () => {
            try {
                if (!deviceId) return;

                const constraints = {
                    video: {
                        deviceId: { exact: deviceId },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    }
                };

                stream = await navigator.mediaDevices.getUserMedia(constraints);

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
            }
        };

        startStream();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [deviceId]);

    return (
        <div className="live-view-container">
            <video ref={videoRef} className="live-video" autoPlay playsInline muted />
        </div>
    );
});

export default LiveView;
