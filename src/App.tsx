import { useState, useRef } from 'react'
import './App.css'

function App() {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const zoomContainerRef = useRef<HTMLDivElement>(null)

  const handleImageUpload = (file: File) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      setImageSrc(reader.result?.toString() || '')
    })
    reader.readAsDataURL(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        handleImageUpload(file)
      }
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.5, 10))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.5, 0.1))
  }

  const handleResetZoom = () => {
    setZoomLevel(1)
    setPanPosition({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsPanning(true)
      setLastPanPoint({ x: e.clientX, y: e.clientY })
      e.preventDefault()
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && zoomLevel > 1) {
      const deltaX = e.clientX - lastPanPoint.x
      const deltaY = e.clientY - lastPanPoint.y
      
      setPanPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }))
      
      setLastPanPoint({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoomLevel(prev => Math.max(0.1, Math.min(prev * delta, 10)))
  }


  return (
    <div className="app">
      {!imageSrc ? (
        <div className="home-page">
          <h1 className="main-title">Zoom endlessly in to your images</h1>
          <p className="subtitle">Upload an image to start exploring with infinite zoom and AI analysis</p>
          
          <div 
            className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleUploadClick}
          >
            <div className="upload-content">
              <div className="upload-icon">📁</div>
              <div className="upload-text">
                <strong>Upload an image</strong>
                <span>or drag and drop a file</span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="file-input-hidden"
            />
          </div>
        </div>
      ) : (
        <div className="image-view">
          <div className="header">
            <h1>🍌 Nano Banana Telescope 🔭</h1>
            <button 
              onClick={() => {setImageSrc(''); setZoomLevel(1); setPanPosition({ x: 0, y: 0 });}}
              className="back-button"
            >
              ← Back to Upload
            </button>
          </div>

          <div className="main-content">
            <div className="zoom-section">
              <div className="zoom-header">
                <h3>Zoom Explorer</h3>
                <div className="zoom-controls">
                  <button onClick={handleZoomOut} className="zoom-button" disabled={zoomLevel <= 0.1}>
                    🔍-
                  </button>
                  <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
                  <button onClick={handleZoomIn} className="zoom-button" disabled={zoomLevel >= 10}>
                    🔍+
                  </button>
                  <button onClick={handleResetZoom} className="reset-button">
                    Reset
                  </button>
                </div>
              </div>
              
              <div 
                ref={zoomContainerRef}
                className="zoom-container"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              >
                <div 
                  className="zoom-image-wrapper"
                  style={{
                    transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                    cursor: zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'
                  }}
                >
                  <img
                    src={imageSrc}
                    alt="Zoom view"
                    className="zoom-image"
                    draggable={false}
                  />
                </div>
              </div>
              
              <div className="zoom-info">
                <p>Use mouse wheel to zoom, drag to pan when zoomed in</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App