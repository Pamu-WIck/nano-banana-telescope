import { useState, useRef, useCallback, useEffect } from 'react'
import './App.css'
import { LoadingOverlay } from './components/LoadingOverlay'
import { useImageCache } from './hooks/useImageCache'
import { geminiService } from './services/geminiService'
import { shouldEnhanceImage, getVisibleImageBounds, generateCacheKey } from './utils/viewport'
import type { EnhancedImage, EnhancementState } from './types/enhancement'

function App() {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  const [currentDisplayImage, setCurrentDisplayImage] = useState<string>('')
  const [enhancementState, setEnhancementState] = useState<EnhancementState>({
    isProcessing: false,
    error: null,
    progress: 0,
    lastProcessedZoom: 0
  })
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const zoomContainerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const enhancementTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const { getCachedImage, setCachedImage, findSimilarCachedImage, clearCache } = useImageCache(20)

  const handleImageUpload = (file: File) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const newImageSrc = reader.result?.toString() || ''
      setImageSrc(newImageSrc)
      setCurrentDisplayImage(newImageSrc)
      clearCache()
      setEnhancementState({
        isProcessing: false,
        error: null,
        progress: 0,
        lastProcessedZoom: 0
      })
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
    setZoomLevel(prev => {
      const newZoom = Math.min(prev * 1.5, 10)
      handleZoomChange(newZoom)
      return newZoom
    })
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const newZoom = Math.max(prev / 1.5, 0.1)
      handleZoomChange(newZoom)
      return newZoom
    })
  }

  const handleResetZoom = () => {
    setZoomLevel(1)
    setPanPosition({ x: 0, y: 0 })
    setCurrentDisplayImage(imageSrc)
    if (currentRequestId) {
      geminiService.cancelRequest(currentRequestId)
      setCurrentRequestId(null)
    }
    setEnhancementState({
      isProcessing: false,
      error: null,
      progress: 0,
      lastProcessedZoom: 0
    })
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

  const checkAndEnhanceImage = useCallback(async (zoomLevel: number) => {
    if (!shouldEnhanceImage(zoomLevel) || !imageSrc || !imageRef.current || !zoomContainerRef.current) {
      if (zoomLevel <= 3.0 && currentDisplayImage !== imageSrc) {
        setCurrentDisplayImage(imageSrc)
      }
      return
    }

    try {
      const cropArea = getVisibleImageBounds(
        zoomContainerRef.current,
        imageRef.current,
        zoomLevel,
        panPosition
      )

      const cacheKey = generateCacheKey(imageSrc, {
        x: cropArea.x,
        y: cropArea.y,
        width: cropArea.width,
        height: cropArea.height
      }, zoomLevel)

      const cachedImage = getCachedImage(cacheKey)
      if (cachedImage) {
        setCurrentDisplayImage(cachedImage.data)
        return
      }

      const similarCached = findSimilarCachedImage(
        imageSrc,
        {
          x: cropArea.x,
          y: cropArea.y,
          width: cropArea.width,
          height: cropArea.height
        },
        zoomLevel,
        100
      )

      if (similarCached) {
        setCurrentDisplayImage(similarCached.data)
        return
      }

      if (enhancementState.isProcessing) {
        return
      }

      const requestId = geminiService.generateRequestId()
      setCurrentRequestId(requestId)
      setEnhancementState({
        isProcessing: true,
        error: null,
        progress: 0,
        lastProcessedZoom: zoomLevel
      })

      const enhancedImageData = await geminiService.enhanceImageCrop(
        imageSrc,
        cropArea,
        requestId,
        (progress) => {
          setEnhancementState(prev => ({ ...prev, progress }))
        }
      )

      const enhancedImage: EnhancedImage = {
        id: cacheKey,
        data: enhancedImageData,
        zoomLevel,
        viewport: {
          x: cropArea.x,
          y: cropArea.y,
          width: cropArea.width,
          height: cropArea.height
        },
        originalImageSrc: imageSrc,
        createdAt: Date.now()
      }

      setCachedImage(enhancedImage)
      setCurrentDisplayImage(enhancedImageData)
      setEnhancementState({
        isProcessing: false,
        error: null,
        progress: 100,
        lastProcessedZoom: zoomLevel
      })
      setCurrentRequestId(null)

    } catch (error) {
      console.error('Enhancement failed:', error)
      setEnhancementState({
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Enhancement failed',
        progress: 0,
        lastProcessedZoom: 0
      })
      setCurrentRequestId(null)
    }
  }, [imageSrc, panPosition, currentDisplayImage, enhancementState.isProcessing, getCachedImage, findSimilarCachedImage, setCachedImage])

  const handleZoomChange = useCallback((newZoomLevel: number) => {
    if (enhancementTimeoutRef.current) {
      clearTimeout(enhancementTimeoutRef.current)
    }

    enhancementTimeoutRef.current = setTimeout(() => {
      checkAndEnhanceImage(newZoomLevel)
    }, 500)
  }, [checkAndEnhanceImage])

  const handleCancelEnhancement = useCallback(() => {
    if (currentRequestId) {
      geminiService.cancelRequest(currentRequestId)
      setCurrentRequestId(null)
    }
    setEnhancementState({
      isProcessing: false,
      error: null,
      progress: 0,
      lastProcessedZoom: 0
    })
  }, [currentRequestId])

  useEffect(() => {
    return () => {
      if (enhancementTimeoutRef.current) {
        clearTimeout(enhancementTimeoutRef.current)
      }
      if (currentRequestId) {
        geminiService.cancelRequest(currentRequestId)
      }
    }
  }, [currentRequestId])

  useEffect(() => {
    if (imageSrc && !currentDisplayImage) {
      setCurrentDisplayImage(imageSrc)
    }
  }, [imageSrc, currentDisplayImage])

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoomLevel(prev => {
      const newZoom = Math.max(0.1, Math.min(prev * delta, 10))
      handleZoomChange(newZoom)
      return newZoom
    })
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
              onClick={() => {
                setImageSrc('')
                setCurrentDisplayImage('')
                setZoomLevel(1)
                setPanPosition({ x: 0, y: 0 })
                clearCache()
                if (currentRequestId) {
                  geminiService.cancelRequest(currentRequestId)
                  setCurrentRequestId(null)
                }
                setEnhancementState({
                  isProcessing: false,
                  error: null,
                  progress: 0,
                  lastProcessedZoom: 0
                })
              }}
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
                style={{ position: 'relative' }}
              >
                <div 
                  className="zoom-image-wrapper"
                  style={{
                    transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                    cursor: zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'
                  }}
                >
                  <img
                    ref={imageRef}
                    src={currentDisplayImage || imageSrc}
                    alt="Zoom view"
                    className="zoom-image"
                    draggable={false}
                  />
                </div>
                <LoadingOverlay
                  isVisible={enhancementState.isProcessing}
                  progress={enhancementState.progress}
                  message="Enhancing image with AI..."
                  onCancel={handleCancelEnhancement}
                />
              </div>
              
              <div className="zoom-info">
                <p>Use mouse wheel to zoom, drag to pan when zoomed in</p>
                {zoomLevel > 3.0 && (
                  <p className="enhancement-info">
                    🤖 AI enhancement active at {Math.round(zoomLevel * 100)}% zoom
                  </p>
                )}
                {enhancementState.error && (
                  <p className="error-info">
                    ⚠️ Enhancement failed: {enhancementState.error}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App