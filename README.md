# 🍌 Banana Scope 🔭

An AI-powered infinite zoom application that enhances images using Google's Gemini AI. Zoom beyond the limits of your images and watch as AI intelligently enhances and adds realistic details to create an infinite exploration experience.

![Banana Scope](img.png)

## ✨ Features

### 🔍 Infinite AI-Enhanced Zoom
- **Smart Enhancement**: Automatically enhances image quality when zooming beyond 300%
- **Viewport Intelligence**: Only processes the visible zoomed area, not the entire image
- **Progressive Enhancement**: Each enhancement becomes a new base image for further exploration
- **Intelligent Caching**: Avoids re-processing similar viewports with LRU cache

### 🎯 Core Functionality
- **Drag & Drop Upload**: Simple image upload with visual feedback
- **Smooth Pan & Zoom**: Mouse wheel zoom and click-drag panning
- **Multiple Aspect Ratios**: Support for 16:9, 4:3, 1:1, 21:9, 9:16, 3:2, and 2:3
- **Image History Navigation**: Navigate through original and AI-enhanced versions
- **Real-time Progress**: Loading overlay with progress tracking and cancellation

### 📱 Responsive Design
- Optimized for desktop, laptop, and mobile screens
- Adaptive layouts for small laptops (11-13 inch screens)
- Touch-friendly controls for mobile devices

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Google AI Studio API key (get one at [https://ai.google.dev/](https://ai.google.dev/))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/nano-banana-telescope.git
cd nano-banana-telescope
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:
```env
VITE_GOOGLE_AI_API_KEY=your_gemini_api_key_here
```

Or copy from the example:
```bash
cp .env.example .env
# Then edit .env with your API key
```

### Running the Application

**Development mode** (with hot reload):
```bash
npm run dev
```
The app will open at `http://localhost:5173`

**Production build**:
```bash
npm run build
npm run preview
```

**Type checking**:
```bash
npx tsc --noEmit
```

**Linting**:
```bash
npm run lint
```

## 🎮 How to Use

1. **Upload an Image**
   - Drag and drop an image onto the upload zone
   - Or click to select a file from your computer

2. **Explore with Zoom**
   - Scroll mouse wheel to zoom in/out
   - Click and drag to pan when zoomed in
   - Use zoom buttons (+/-) for precise control
   - Click Reset to return to 100% zoom

3. **AI Enhancement**
   - Zoom beyond 300% to trigger automatic AI enhancement
   - Watch the progress indicator as AI processes the visible area
   - Enhanced image becomes the new base at 100% zoom

4. **Navigate History**
   - Use Previous/Next buttons to move between enhancement levels
   - "Original View" → "Focus Layer 1" → "Focus Layer 2" etc.
   - Each level represents a deeper AI-enhanced exploration

5. **Adjust Aspect Ratio**
   - Select from popular ratios (16:9, 4:3, 1:1, etc.)
   - Perfect for different image types and screen orientations

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **AI Integration**: Google Gemini AI (gemini-2.0-flash-exp model)
- **Styling**: CSS with responsive design

### Key Components
- `App.tsx` - Main application component with image history management
- `geminiService.ts` - Singleton service for Gemini AI API calls
- `viewport.ts` - Viewport calculation and image cropping utilities
- `useImageCache.ts` - Custom hook for intelligent LRU caching
- `LoadingOverlay.tsx` - Progress UI with cancellation support

### Enhancement Pipeline
```
User Zoom → Debounced Check (500ms) → Viewport Calculation → 
Cache Lookup → AI Enhancement → History Update → Reset to 100%
```

## 🔧 Configuration

### Environment Variables
- `VITE_GOOGLE_AI_API_KEY` - Your Gemini AI API key (required)

### Cache Settings
- Default cache size: 20 images
- Cache tolerance: 100px for similar viewport matching
- Age-based pruning: 10 minutes

## 📝 Development Notes

- Hot reload may require restart for TypeScript import changes
- Environment variables must be prefixed with `VITE_`
- Image history is stored in React state (not persisted)
- Canvas operations require CORS-compliant images

## 🐛 Troubleshooting

**"No image data found" error**
- Verify your Gemini API key is correctly set in `.env`
- Ensure you're using the correct model: `gemini-2.0-flash-exp`

**Enhancement not triggering**
- Check that zoom level exceeds 300%
- Verify network connection for API calls
- Check browser console for detailed error messages

**Performance issues**
- Clear cache if experiencing slowdowns
- Reduce cache size in `useImageCache` if memory constrained
- Check network tab for API response times

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- Google Gemini AI for image enhancement capabilities
- React and Vite communities for excellent tooling
- All contributors and users of Banana Scope

---

**Enjoy exploring the infinite depths of your images with Banana Scope!** 🍌🔭