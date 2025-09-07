import type { ViewportBounds, CropArea } from '../types/enhancement';

export const calculateViewportBounds = (
  containerRect: DOMRect,
  imageElement: HTMLImageElement
): ViewportBounds => {
  const imageRect = imageElement.getBoundingClientRect();
  const imageNaturalWidth = imageElement.naturalWidth;
  const imageNaturalHeight = imageElement.naturalHeight;

  // Calculate the displayed image dimensions
  const displayedWidth = imageRect.width;
  const displayedHeight = imageRect.height;

  // Calculate scale factors from displayed to natural dimensions
  const scaleX = imageNaturalWidth / displayedWidth;
  const scaleY = imageNaturalHeight / displayedHeight;

  // Calculate the visible area in container coordinates
  const visibleLeft = Math.max(0, containerRect.left - imageRect.left);
  const visibleTop = Math.max(0, containerRect.top - imageRect.top);
  const visibleRight = Math.min(displayedWidth, containerRect.right - imageRect.left);
  const visibleBottom = Math.min(displayedHeight, containerRect.bottom - imageRect.top);

  // Convert to natural image coordinates
  const naturalLeft = visibleLeft * scaleX;
  const naturalTop = visibleTop * scaleY;
  const naturalWidth = (visibleRight - visibleLeft) * scaleX;
  const naturalHeight = (visibleBottom - visibleTop) * scaleY;

  return {
    x: Math.max(0, Math.round(naturalLeft)),
    y: Math.max(0, Math.round(naturalTop)),
    width: Math.round(naturalWidth),
    height: Math.round(naturalHeight)
  };
};

export const cropImageFromCanvas = async (
  imageSrc: string,
  cropArea: CropArea
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Calculate 4:3 aspect ratio dimensions
      const aspectRatio = 4 / 3;
      let finalWidth = cropArea.width;
      let finalHeight = cropArea.height;
      let sourceX = cropArea.x;
      let sourceY = cropArea.y;
      let sourceWidth = cropArea.width;
      let sourceHeight = cropArea.height;
      
      const currentRatio = cropArea.width / cropArea.height;
      
      if (currentRatio > aspectRatio) {
        // Image is wider than 4:3, adjust width or crop horizontally
        finalWidth = Math.round(cropArea.height * aspectRatio);
        finalHeight = cropArea.height;
        // Center the crop horizontally
        const widthDiff = cropArea.width - finalWidth;
        sourceX = cropArea.x + Math.round(widthDiff / 2);
        sourceWidth = finalWidth;
      } else if (currentRatio < aspectRatio) {
        // Image is taller than 4:3, adjust height or crop vertically
        finalWidth = cropArea.width;
        finalHeight = Math.round(cropArea.width / aspectRatio);
        // Center the crop vertically
        const heightDiff = cropArea.height - finalHeight;
        sourceY = cropArea.y + Math.round(heightDiff / 2);
        sourceHeight = finalHeight;
      }
      
      // Set canvas size to 4:3 dimensions
      canvas.width = finalWidth;
      canvas.height = finalHeight;
      
      // Draw the cropped portion with 4:3 aspect ratio
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, finalWidth, finalHeight
      );
      
      // Convert to base64
      const croppedImageData = canvas.toDataURL('image/png');
      resolve(croppedImageData);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
};

export const generateCacheKey = (
  imageSrc: string,
  viewport: ViewportBounds,
  zoomLevel: number
): string => {
  const roundedZoom = Math.round(zoomLevel * 100) / 100;
  return `${btoa(imageSrc.slice(0, 50))}_${viewport.x}_${viewport.y}_${viewport.width}_${viewport.height}_${roundedZoom}`;
};

export const shouldEnhanceImage = (zoomLevel: number): boolean => {
  return zoomLevel > 3.0; // 300%
};

export const getVisibleImageBounds = (
  containerElement: HTMLElement,
  imageElement: HTMLImageElement,
  zoomLevel: number,
  panPosition: { x: number; y: number }
): CropArea => {
  const containerRect = containerElement.getBoundingClientRect();
  const imageRect = imageElement.getBoundingClientRect();
  
  // Calculate the actual displayed size of the image
  const displayedWidth = imageElement.offsetWidth * zoomLevel;
  const displayedHeight = imageElement.offsetHeight * zoomLevel;
  
  // Calculate the position of the image relative to container
  const imageLeft = imageRect.left - containerRect.left + panPosition.x;
  const imageTop = imageRect.top - containerRect.top + panPosition.y;
  
  // Calculate visible area boundaries
  const visibleLeft = Math.max(0, -imageLeft);
  const visibleTop = Math.max(0, -imageTop);
  const visibleRight = Math.min(displayedWidth, containerRect.width - imageLeft);
  const visibleBottom = Math.min(displayedHeight, containerRect.height - imageTop);
  
  // Convert to natural image coordinates
  const scaleX = imageElement.naturalWidth / imageElement.offsetWidth;
  const scaleY = imageElement.naturalHeight / imageElement.offsetHeight;
  
  const cropX = (visibleLeft / zoomLevel) * scaleX;
  const cropY = (visibleTop / zoomLevel) * scaleY;
  const cropWidth = ((visibleRight - visibleLeft) / zoomLevel) * scaleX;
  const cropHeight = ((visibleBottom - visibleTop) / zoomLevel) * scaleY;
  
  return {
    x: Math.max(0, Math.round(cropX)),
    y: Math.max(0, Math.round(cropY)),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
    sourceWidth: imageElement.naturalWidth,
    sourceHeight: imageElement.naturalHeight
  };
};