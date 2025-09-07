import React from 'react';
import './LoadingOverlay.css';

interface LoadingOverlayProps {
  isVisible: boolean;
  progress: number;
  message?: string;
  onCancel?: () => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  progress,
  message = 'Adjusting telescope lenses...',
  onCancel
}) => {
  if (!isVisible) return null;

  return (
    <div className="telescope-status-overlay">
      <div className="telescope-status-content">
        <div className="telescope-message">
          <h3>{message}<span className="dots">...</span></h3>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;