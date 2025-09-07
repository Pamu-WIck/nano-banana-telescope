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
Nano Banana Telescope is an AI-enhanced image zoom application that provides infinite zoom with intelligent image enhancement. When users zoom beyond 300%, the app automatically crops the visible area and uses Google's Gemini AI to enhance image quality and add realistic details.

### Key Architecture Components

#### AI Enhancement Pipeline
- **Trigger**: Automatic enhancement when zoom level > 300%
- **Viewport Calculation**: `src/utils/viewport.ts` calculates visible image bounds and crops only the zoomed area
- **AI Processing**: `src/services/geminiService.ts` sends cropped images to Gemini AI for enhancement
- **Smart Caching**: `src/hooks/useImageCache.ts` implements LRU caching to avoid re-processing similar viewports

#### State Management Flow
```
User Zoom > Debounced Check > Viewport Calculation > Cache Check > AI Enhancement > Display
```

#### Core Data Flow
1. **Image Upload**: User uploads image via drag-and-drop or file picker
2. **Zoom Detection**: Mouse wheel/button zoom changes trigger `handleZoomChange` with 500ms debounce
3. **Enhancement Decision**: `shouldEnhanceImage()` checks if zoom > 300%
4. **Viewport Cropping**: `getVisibleImageBounds()` calculates exact visible area in natural image coordinates
5. **Cache Lookup**: System checks for existing enhanced images within tolerance (100px default)
6. **AI Enhancement**: If no cache hit, `geminiService.enhanceImageCrop()` processes the cropped area
7. **Display Update**: Enhanced image replaces display, original restored when zoom < 300%

#### Key Technical Details

**Gemini AI Integration**
- Model: `gemini-2.0-flash-exp` 
- Input: Base64-encoded PNG of cropped viewport
- Prompt: Focuses on sharpening, texture detail, and realistic enhancement
- Progress tracking with cancellation support

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
**Components**: `src/components/LoadingOverlay.tsx` - Loading UI with progress and cancellation

### API Key Management
The Gemini API key is currently hardcoded in `geminiService.ts`. For production deployment, move to environment variables and implement secure key management.

### Development Notes
- Hot reload issues with TypeScript imports may require dev server restart
- ESLint enforces React hooks exhaustive dependencies
- All enhancement functions use `useCallback` for performance
- Canvas operations require `crossOrigin: 'anonymous'` for external images