import { useState, useRef, useCallback, useEffect } from 'react'
import './App.css'
import { LoadingOverlay } from './components/LoadingOverlay'
import { useImageCache } from './hooks/useImageCache'
import { geminiService } from './services/geminiService'
import { shouldEnhanceImage, getVisibleImageBounds, generateCacheKey } from './utils/viewport'
import type { EnhancedImage, EnhancementState } from './types/enhancement'

interface ImageHistoryItem {
  image: string
  level: number
  timestamp: number
}

interface AspectRatio {
  label: string
  value: string
  width: number
  height: number
}

const aspectRatios: AspectRatio[] = [
  { label: '16:9', value: '16 / 9', width: 16, height: 9 },
  { label: '4:3', value: '4 / 3', width: 4, height: 3 },
  { label: '1:1', value: '1 / 1', width: 1, height: 1 },
  { label: '21:9', value: '21 / 9', width: 21, height: 9 },
  { label: '9:16', value: '9 / 16', width: 9, height: 16 },
  { label: '3:2', value: '3 / 2', width: 3, height: 2 },
  { label: '2:3', value: '2 / 3', width: 2, height: 3 },
]

function App() {
  const [originalImageSrc, setOriginalImageSrc] = useState<string>('')
  const [imageHistory, setImageHistory] = useState<ImageHistoryItem[]>([])
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0)
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
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>(aspectRatios[1]) // Default to 4:3
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const zoomContainerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const enhancementTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  
  const { getCachedImage, setCachedImage, findSimilarCachedImage, clearCache } = useImageCache(20)

  // Helper function to get current base image
  const getCurrentBaseImage = useCallback(() => {
    if (currentHistoryIndex === -1 || imageHistory.length === 0) return originalImageSrc
    return imageHistory[currentHistoryIndex]?.image || originalImageSrc
  }, [imageHistory, currentHistoryIndex, originalImageSrc])

  // Calculate zoom level to fit image to container height
  const calculateFitToHeightZoom = useCallback(() => {
    if (!imageRef.current || !zoomContainerRef.current) return 1
    
    const containerHeight = zoomContainerRef.current.clientHeight
    const imageNaturalHeight = imageRef.current.naturalHeight
    const imageDisplayHeight = imageRef.current.offsetHeight
    
    // Calculate zoom needed to fit height
    const fitZoom = containerHeight / imageDisplayHeight
    
    // Clamp between min and max zoom levels
    return Math.min(Math.max(fitZoom, 0.1), 10)
  }, [])

  // Helper function to add new enhanced image to history
  const addToHistory = useCallback((enhancedImage: string) => {
    const newHistoryItem: ImageHistoryItem = {
      image: enhancedImage,
      level: imageHistory.length + 1,
      timestamp: Date.now()
    }
    setImageHistory(prev => [...prev, newHistoryItem])
    setCurrentHistoryIndex(imageHistory.length)
  }, [imageHistory.length])

  // Simple image switching without effects
  const performLensTransition = useCallback(async (newIndex: number, direction: 'next' | 'previous') => {
    if (!wrapperRef.current || !imageRef.current) return
    
    setIsTransitioning(true)
    
    // Simply switch to the new image at 100% zoom
    setCurrentHistoryIndex(newIndex)
    setPanPosition({ x: 0, y: 0 })
    setZoomLevel(1.0)
    
    // Small delay to prevent rapid clicking
    setTimeout(() => {
      setIsTransitioning(false)
    }, 100)
  }, [])
  
  // Navigation functions
  const goToPreviousImage = useCallback(() => {
    if (isTransitioning) return
    
    const targetIndex = currentHistoryIndex > 0 ? currentHistoryIndex - 1 : -1
    if (targetIndex === currentHistoryIndex) return
    
    performLensTransition(targetIndex, 'previous')
  }, [currentHistoryIndex, imageHistory.length, isTransitioning, performLensTransition])

  const goToNextImage = useCallback(() => {
    if (isTransitioning || currentHistoryIndex >= imageHistory.length - 1) return
    
    const targetIndex = currentHistoryIndex + 1
    performLensTransition(targetIndex, 'next')
  }, [currentHistoryIndex, imageHistory.length, isTransitioning, performLensTransition])

  const handleImageUpload = (file: File) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const newImageSrc = reader.result?.toString() || ''
      setOriginalImageSrc(newImageSrc)
      setCurrentDisplayImage(newImageSrc)
      setImageHistory([])
      setCurrentHistoryIndex(-1) // -1 means showing original image
      setZoomLevel(1)
      setPanPosition({ x: 0, y: 0 })
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
    const currentBase = getCurrentBaseImage()
    setCurrentDisplayImage(currentBase)
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
    const currentBaseImage = getCurrentBaseImage()
    
    if (!shouldEnhanceImage(zoomLevel) || !currentBaseImage || !imageRef.current || !zoomContainerRef.current) {
      if (zoomLevel <= 3.0 && currentDisplayImage !== currentBaseImage) {
        setCurrentDisplayImage(currentBaseImage)
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

      const cacheKey = generateCacheKey(currentBaseImage, {
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
        currentBaseImage,
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
        currentBaseImage,
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
        originalImageSrc: currentBaseImage,
        createdAt: Date.now()
      }

      setCachedImage(enhancedImage)
      
      // Add enhanced image to history and fit to height
      addToHistory(enhancedImageData)
      setCurrentDisplayImage(enhancedImageData)
      
      // Wait for image to load then calculate fit-to-height zoom
      setTimeout(() => {
        const fitZoom = calculateFitToHeightZoom()
        setZoomLevel(fitZoom)
        setPanPosition({ x: 0, y: 0 })
      }, 50)
      
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
        error: null,
        progress: 0,
        lastProcessedZoom: 0
      })
      setCurrentRequestId(null)
    }
  }, [getCurrentBaseImage, panPosition, currentDisplayImage, enhancementState.isProcessing, getCachedImage, findSimilarCachedImage, setCachedImage, addToHistory, calculateFitToHeightZoom])

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
    const currentBase = getCurrentBaseImage()
    if (currentBase && !currentDisplayImage) {
      setCurrentDisplayImage(currentBase)
    }
  }, [getCurrentBaseImage, currentDisplayImage])

  // Update display image when history index changes
  useEffect(() => {
    const currentBase = getCurrentBaseImage()
    if (currentBase) {
      setCurrentDisplayImage(currentBase)
    }
  }, [currentHistoryIndex, getCurrentBaseImage])

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
      {!originalImageSrc ? (
        <div className="home-page">
          <h1 className="app-title">🍌 Banana Scope 🔭</h1>
          <h2 className="main-title">Explore the infinite depths of your images</h2>
          <p className="subtitle">Upload an image to peer through the telescope's powerful optical layers</p>
          
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
            <h1>🍌 Banana Scope 🔭</h1>
            <button 
              onClick={() => {
                setOriginalImageSrc('')
                setCurrentDisplayImage('')
                setImageHistory([])
                setCurrentHistoryIndex(-1)
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
                <h3>Telescope Viewfinder</h3>
                <div className="zoom-controls">
                  <button onClick={handleZoomOut} className="zoom-button" disabled={zoomLevel <= 0.1 || isTransitioning}>
                    🔍-
                  </button>
                  <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
                  <button onClick={handleZoomIn} className="zoom-button" disabled={zoomLevel >= 10 || isTransitioning}>
                    🔍+
                  </button>
                  <button onClick={handleResetZoom} className="reset-button" disabled={isTransitioning}>
                    Reset
                  </button>
                </div>
                
                <div className="ratio-controls">
                  <span className="ratio-label">Aspect Ratio:</span>
                  <div className="ratio-buttons">
                    {aspectRatios.map((ratio) => (
                      <button
                        key={ratio.label}
                        onClick={() => setSelectedRatio(ratio)}
                        className={`ratio-button ${selectedRatio.label === ratio.label ? 'active' : ''}`}
                        title={`Set aspect ratio to ${ratio.label}`}
                      >
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {imageHistory.length > 0 && (
                  <div className="history-controls">
                    <button 
                      onClick={goToPreviousImage} 
                      className="history-button" 
                      disabled={currentHistoryIndex <= -1 || isTransitioning}
                      title="Go to previous focus layer"
                    >
                      ← Previous
                    </button>
                    <span className="history-info">
                      {currentHistoryIndex === -1 ? 'Original View' : `Focus Layer ${currentHistoryIndex + 1}`}
                      {imageHistory.length > 0 && ` / ${imageHistory.length} depth layers`}
                    </span>
                    <button 
                      onClick={goToNextImage} 
                      className="history-button" 
                      disabled={currentHistoryIndex >= imageHistory.length - 1 || isTransitioning}
                      title="Go to next focus layer"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
              
              <div 
                ref={zoomContainerRef}
                className="zoom-container"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                style={{ 
                  position: 'relative',
                  aspectRatio: selectedRatio.value
                }}
              >
                <div 
                  ref={wrapperRef}
                  className="zoom-image-wrapper"
                  style={{
                    transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                    cursor: zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'
                  }}
                >
                  <img
                    ref={imageRef}
                    src={currentDisplayImage || getCurrentBaseImage()}
                    alt="Zoom view"
                    className={`zoom-image ${enhancementState.isProcessing ? 'blurred' : ''}`}
                    draggable={false}
                  />
                </div>
                <LoadingOverlay
                  isVisible={enhancementState.isProcessing}
                  progress={enhancementState.progress}
                  message="Adjusting telescope lenses..."
                  onCancel={handleCancelEnhancement}
                />
              </div>
              
              <div className="zoom-info">
                <p>Scroll to adjust magnification, drag to explore when zoomed</p>
                {zoomLevel > 3.0 && (
                  <p className="enhancement-info">
                    🔭 Focusing deep space optics at {Math.round(zoomLevel * 100)}% magnification
                  </p>
                )}
                {enhancementState.error && (
                  <p className="error-info">
                    ⚠️ Lens calibration failed: {enhancementState.error}
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