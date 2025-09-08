# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server (runs on localhost:5173+)
- `npm run build` - Build for production (TypeScript compilation + Vite build)
- `npm run lint` - Run ESLint on the entire codebase
- `npx tsc --noEmit` - Type check without emitting files
- `npm run preview` - Preview production build locally

## Application Architecture

### Core Concept
Nano Banana Telescope is an AI-enhanced image zoom application that provides infinite zoom with intelligent image enhancement. When users zoom beyond 300%, the app automatically crops the visible area and uses Google's Gemini AI to enhance image quality and add realistic details. Each enhancement creates a new base image at 100% zoom, allowing for infinite enhancement cycles with full navigation history.

### Key Architecture Components

#### AI Enhancement Pipeline
- **Trigger**: Automatic enhancement when zoom level > 300%
- **Viewport Calculation**: `src/utils/viewport.ts` calculates visible image bounds and crops only the zoomed area
- **AI Processing**: `src/services/geminiService.ts` sends cropped images to Gemini AI for enhancement
- **Smart Caching**: `src/hooks/useImageCache.ts` implements LRU caching to avoid re-processing similar viewports
- **History Tracking**: Enhanced images are stored in a navigable history chain

#### Image History System
- **Original Image**: Preserved at index -1, never modified
- **Enhancement Levels**: Sequential indexes (0, 1, 2...) for each AI enhancement
- **Navigation Controls**: Previous/Next buttons to move through enhancement history
- **Automatic Reset**: Zoom resets to 100% when switching between history levels
- **Current Base Image**: The active image used for the next enhancement cycle

#### State Management Flow
```
User Zoom > Debounced Check > Viewport Calculation > Cache Check > AI Enhancement > Add to History > Reset Zoom to 100%
```

#### Core Data Flow
1. **Image Upload**: User uploads image via drag-and-drop or file picker
2. **Zoom Detection**: Mouse wheel/button zoom changes trigger `handleZoomChange` with 500ms debounce
3. **Enhancement Decision**: `shouldEnhanceImage()` checks if zoom > 300%
4. **Viewport Cropping**: `getVisibleImageBounds()` calculates exact visible area in natural image coordinates
5. **Cache Lookup**: System checks for existing enhanced images within tolerance (100px default)
6. **AI Enhancement**: If no cache hit, `geminiService.enhanceImageCrop()` processes the cropped area
7. **History Update**: Enhanced image is added to history and becomes the new base image
8. **Zoom Reset**: Zoom level automatically resets to 100% after enhancement
9. **Navigation**: Users can navigate between original and enhanced images using Previous/Next buttons

#### Key Technical Details

**Gemini AI Integration**
- Model: `gemini-2.5-flash-image-preview` 
- Package: `@google/generative-ai` v0.24.1
- Input: Base64-encoded PNG of cropped viewport
- Prompt: Focuses on sharpening, texture detail, and realistic enhancement
- Progress tracking with cancellation support
- API Key: Configured via `VITE_GOOGLE_AI_API_KEY` environment variable

**Caching Strategy**
- Multi-level cache with viewport similarity matching
- LRU eviction when cache exceeds maxCacheSize (default: 20)
- 10-minute age-based pruning
- Cache keys include image hash, viewport bounds, and zoom level

**Performance Optimizations**
- 500ms debounce on zoom changes prevents excessive API calls  
- Request cancellation for rapid zoom changes
- Canvas-based image cropping for precision
- Viewport bounds calculated using natural image coordinates

### File Structure Notes

**Types**: `src/types/enhancement.ts` - Central type definitions for enhancement system
**Services**: `src/services/geminiService.ts` - Singleton service for AI API calls  
**Utils**: `src/utils/viewport.ts` - Viewport calculation and image cropping utilities
**Hooks**: `src/hooks/useImageCache.ts` - Custom hook for intelligent caching
**Components**: 
- `src/components/LoadingOverlay.tsx` - Loading UI with progress and cancellation
- `src/App.tsx` - Main application component with image history management

### API Key Management
The Gemini API key is configured via environment variables:
- **Development**: Set `VITE_GOOGLE_AI_API_KEY` in `.env` file
- **Production**: Configure `VITE_GOOGLE_AI_API_KEY` in deployment environment
- **Example**: See `.env.example` for proper format
- API key obtained from https://ai.google.dev/

### Key Features

#### Infinite Zoom Enhancement
- Each zoom > 300% triggers AI enhancement of the visible viewport
- Enhanced image becomes the new base at 100% zoom
- Process can repeat infinitely for deeper exploration

#### Image History Navigation
- **Original Image**: Always preserved and accessible
- **Enhancement Levels**: Sequential chain of AI-enhanced images
- **Navigation Controls**: Previous/Next buttons with level indicators
- **Smart Reset**: Automatic zoom reset when navigating history
- **History Info Display**: Shows current level (e.g., "Original", "Enhanced 1", "Enhanced 2")

#### User Interface
- **Drag & Drop Upload**: Simple image upload with visual feedback
- **Zoom Controls**: Mouse wheel, zoom buttons (+/-), and reset button
- **Pan Support**: Click and drag to pan when zoomed in
- **Loading Overlay**: Progress indicator during AI enhancement with cancel option
- **Responsive Design**: Mobile-friendly with adaptive layouts

### Development Notes
- Hot reload issues with TypeScript imports may require dev server restart
- ESLint enforces React hooks exhaustive dependencies
- All enhancement functions use `useCallback` for performance
- Canvas operations require `crossOrigin: 'anonymous'` for external images
- Vite automatically restarts when `.env` file changes
- Environment variables must be prefixed with `VITE_` to be accessible in client code
- Image history is stored in React state (not persisted between sessions)

### Troubleshooting
- **Enhancement Error "No image data found"**: Ensure correct Gemini model (`gemini-2.5-flash-image-preview`) and valid API key
- **API Key Issues**: Verify `.env` file exists with `VITE_GOOGLE_AI_API_KEY=your_key_here`
- **Model Errors**: Check console logs for detailed API response structure during debugging
- **History Navigation Issues**: Check that `currentHistoryIndex` is properly managed (-1 for original)
- **Zoom Reset Problems**: Verify `setZoomLevel(1)` is called after enhancement
- add updates to memery
- add to memeory
- add to memory
- add to memeory