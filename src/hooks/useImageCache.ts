import { useState, useCallback, useRef } from 'react';
import type { EnhancedImage, ImageCache, ViewportBounds } from '../types/enhancement';

interface UseCacheReturn {
  cache: ImageCache;
  getCachedImage: (key: string) => EnhancedImage | null;
  setCachedImage: (image: EnhancedImage) => void;
  findSimilarCachedImage: (
    imageSrc: string,
    viewport: ViewportBounds,
    tolerance?: number
  ) => EnhancedImage | null;
  clearCache: () => void;
  removeCacheEntry: (key: string) => void;
  getCacheSize: () => number;
  pruneOldEntries: (maxAge?: number) => void;
}

export const useImageCache = (maxCacheSize: number = 50): UseCacheReturn => {
  const [cache, setCache] = useState<ImageCache>({});
  const cacheKeysRef = useRef<string[]>([]);

  const getCachedImage = useCallback((key: string): EnhancedImage | null => {
    return cache[key] || null;
  }, [cache]);

  const setCachedImage = useCallback((image: EnhancedImage) => {
    setCache(prevCache => {
      const newCache = { ...prevCache };
      const key = image.id;
      
      // If cache is at max size and this is a new entry, remove oldest
      if (!newCache[key] && cacheKeysRef.current.length >= maxCacheSize) {
        const oldestKey = cacheKeysRef.current.shift();
        if (oldestKey && newCache[oldestKey]) {
          delete newCache[oldestKey];
        }
      }
      
      // Add/update the image
      newCache[key] = image;
      
      // Update keys array
      const keyIndex = cacheKeysRef.current.indexOf(key);
      if (keyIndex === -1) {
        cacheKeysRef.current.push(key);
      } else {
        // Move to end (most recently used)
        cacheKeysRef.current.splice(keyIndex, 1);
        cacheKeysRef.current.push(key);
      }
      
      return newCache;
    });
  }, [maxCacheSize]);

  const findSimilarCachedImage = useCallback((
    imageSrc: string,
    viewport: ViewportBounds,
    tolerance: number = 50
  ): EnhancedImage | null => {
    const entries = Object.values(cache);
    
    for (const entry of entries) {
      if (entry.originalImageSrc !== imageSrc) continue;
      
      // Check if viewport is similar (within tolerance pixels)
      const xDiff = Math.abs(entry.viewport.x - viewport.x);
      const yDiff = Math.abs(entry.viewport.y - viewport.y);
      const widthDiff = Math.abs(entry.viewport.width - viewport.width);
      const heightDiff = Math.abs(entry.viewport.height - viewport.height);
      
      if (xDiff <= tolerance && yDiff <= tolerance && 
          widthDiff <= tolerance && heightDiff <= tolerance) {
        return entry;
      }
    }
    
    return null;
  }, [cache]);

  const clearCache = useCallback(() => {
    setCache({});
    cacheKeysRef.current = [];
  }, []);

  const removeCacheEntry = useCallback((key: string) => {
    setCache(prevCache => {
      const newCache = { ...prevCache };
      delete newCache[key];
      return newCache;
    });
    
    const keyIndex = cacheKeysRef.current.indexOf(key);
    if (keyIndex !== -1) {
      cacheKeysRef.current.splice(keyIndex, 1);
    }
  }, []);

  const getCacheSize = useCallback(() => {
    return Object.keys(cache).length;
  }, [cache]);

  const pruneOldEntries = useCallback((maxAge: number = 10 * 60 * 1000) => { // 10 minutes default
    const now = Date.now();
    setCache(prevCache => {
      const newCache = { ...prevCache };
      const keysToRemove: string[] = [];
      
      Object.entries(newCache).forEach(([key, image]) => {
        if (now - image.createdAt > maxAge) {
          keysToRemove.push(key);
        }
      });
      
      keysToRemove.forEach(key => {
        delete newCache[key];
        const keyIndex = cacheKeysRef.current.indexOf(key);
        if (keyIndex !== -1) {
          cacheKeysRef.current.splice(keyIndex, 1);
        }
      });
      
      return newCache;
    });
  }, []);

  return {
    cache,
    getCachedImage,
    setCachedImage,
    findSimilarCachedImage,
    clearCache,
    removeCacheEntry,
    getCacheSize,
    pruneOldEntries
  };
};