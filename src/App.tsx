import { useState, useRef } from 'react'
import ReactCrop from 'react-image-crop'
import type { Crop, PixelCrop } from 'react-image-crop'
import { GoogleGenerativeAI } from '@google/generative-ai'
import 'react-image-crop/dist/ReactCrop.css'
import './App.css'

function App() {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [analysis, setAnalysis] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || '')
        setAnalysis('')
      })
      reader.readAsDataURL(file)
    }
  }

  const analyzeImage = async () => {
    if (!completedCrop || !imgRef.current) return

    setIsLoading(true)
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const image = imgRef.current
      canvas.width = completedCrop.width
      canvas.height = completedCrop.height

      ctx.drawImage(
        image,
        completedCrop.x,
        completedCrop.y,
        completedCrop.width,
        completedCrop.height,
        0,
        0,
        completedCrop.width,
        completedCrop.height
      )

      canvas.toBlob(async (blob) => {
        if (!blob) return
        
        const arrayBuffer = await blob.arrayBuffer()
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

        // Note: You'll need to add your API key here
        const genAI = new GoogleGenerativeAI('YOUR_API_KEY')
        const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' })

        const result = await model.generateContent([
          'Analyze this cropped image and describe what you see in detail.',
          {
            inlineData: {
              data: base64,
              mimeType: 'image/png'
            }
          }
        ])

        const response = await result.response
        setAnalysis(response.text())
      }, 'image/png')
    } catch (error) {
      console.error('Error analyzing image:', error)
      setAnalysis('Error analyzing image. Please check your API key and try again.')
    }
    setIsLoading(false)
  }

  return (
    <div className="app">
      <h1>🍌 Nano Banana Telescope 🔭</h1>
      <p>Upload an image, crop it, and analyze it with AI</p>
      
      <div className="upload-section">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="file-input"
        />
      </div>

      {imageSrc && (
        <div className="crop-section">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Upload"
              className="crop-image"
            />
          </ReactCrop>
          
          {completedCrop && (
            <button 
              onClick={analyzeImage}
              disabled={isLoading}
              className="analyze-button"
            >
              {isLoading ? '🔄 Analyzing...' : '🔍 Analyze Cropped Area'}
            </button>
          )}
        </div>
      )}

      {analysis && (
        <div className="analysis-section">
          <h3>🤖 AI Analysis:</h3>
          <p>{analysis}</p>
        </div>
      )}
    </div>
  )
}

export default App