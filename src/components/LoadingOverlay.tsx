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
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-spinner">
          <div className="spinner-ring">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
        </div>
        
        <div className="loading-text">
          <h3>{message}</h3>
          <p>Calibrating deep space optics...</p>
        </div>
        
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            ></div>
          </div>
          <span className="progress-text">{Math.round(progress)}%</span>
        </div>
        
        {onCancel && (
          <button className="cancel-button" onClick={onCancel}>
            Cancel Focusing
          </button>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;