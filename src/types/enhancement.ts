export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EnhancedImage {
  id: string;
  data: string; // base64 image data
  zoomLevel: number;
  viewport: ViewportBounds;
  originalImageSrc: string;
  createdAt: number;
}

export interface ImageCache {
  [key: string]: EnhancedImage;
}

export interface EnhancementState {
  isProcessing: boolean;
  error: string | null;
  progress: number;
  lastProcessedZoom: number;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
}

export type EnhancementStatus = 'idle' | 'processing' | 'completed' | 'error';