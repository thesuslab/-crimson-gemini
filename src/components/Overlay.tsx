import React from 'react';
import './Overlay.css';

interface OverlayProps {
    imageUrl?: string;
}

const Overlay: React.FC<OverlayProps> = ({ imageUrl }) => {
    if (!imageUrl) return null;

    return (
        <div className="overlay-container">
            <img src={imageUrl} alt="Overlay" className="overlay-image" />
        </div>
    );
};

export default Overlay;
