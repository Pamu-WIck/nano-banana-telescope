import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CropArea } from '../types/enhancement';
import { cropImageFromCanvas } from '../utils/viewport';

const GEMINI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;

// Debug helper to save images to file system
const saveDebugImage = async (base64Data: string, filename: string): Promise<void> => {
  try {
    // Convert base64 to blob
    const base64WithoutPrefix = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const byteCharacters = atob(base64WithoutPrefix);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`Debug image saved: ${filename}`);
  } catch (error) {
    console.error('Failed to save debug image:', error);
  }
};

class GeminiEnhancementService {
  private ai: GoogleGenerativeAI;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor() {
    this.ai = new GoogleGenerativeAI(GEMINI_API_KEY);
  }

  async enhanceImageCrop(
    originalImageSrc: string,
    cropArea: CropArea,
    requestId: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      // Create abort controller for this request
      const abortController = new AbortController();
      this.abortControllers.set(requestId, abortController);

      onProgress?.(10); // Starting crop

      // Crop the image to the specified area
      const croppedImageData = await cropImageFromCanvas(originalImageSrc, cropArea);
      
      // Debug: Save input image
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const inputFilename = `debug-images/input_${timestamp}_${cropArea.width}x${cropArea.height}.png`;
      await saveDebugImage(croppedImageData, inputFilename);
      console.log(`Saved input image: ${inputFilename} (${cropArea.width}x${cropArea.height}, 4:3 ratio)`);
      
      onProgress?.(30); // Crop completed, starting AI enhancement

      // Convert to base64 format expected by Gemini
      const base64Data = croppedImageData.split(',')[1];

      const prompt = [
        { 
          text: "Enhance and reimagine this image with increased quality and detail. Focus on sharpening edges, improving texture detail, and adding realistic details that would be visible at higher magnification. Maintain the original style and content while making it appear as if taken with a higher resolution camera." 
        },
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Data,
          },
        },
      ];

      onProgress?.(50); // AI processing started

      // Check if request was aborted
      if (abortController.signal.aborted) {
        throw new Error('Request was aborted');
      }

      const model = this.ai.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });
      const response = await model.generateContent(prompt);

      onProgress?.(80); // AI processing completed

      // Debug: Log the full response structure
      console.log('Full Gemini response:', JSON.stringify(response, null, 2));
      
      // Extract the enhanced image from response
      const candidates = response.response.candidates;
      console.log('Candidates:', candidates);
      
      if (!candidates || candidates.length === 0) {
        throw new Error('No enhanced image generated');
      }

      const parts = candidates[0].content.parts;
      console.log('Parts:', parts);
      
      for (const part of parts) {
        console.log('Processing part:', part);
        if (part.inlineData && part.inlineData.data) {
          onProgress?.(100); // Complete
          
          // Clean up abort controller
          this.abortControllers.delete(requestId);
          
          // Create data URL for the enhanced image
          const enhancedImageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          
          // Debug: Save output image with same timestamp
          const outputFilename = `debug-images/output_${timestamp}_enhanced.png`;
          await saveDebugImage(enhancedImageData, outputFilename);
          console.log(`Saved output image: ${outputFilename}`);
          console.log(`Enhancement complete: ${inputFilename} -> ${outputFilename}`);
          
          // Return enhanced image
          return enhancedImageData;
        }
      }

      throw new Error('No image data found in AI response');

    } catch (error) {
      // Clean up abort controller
      this.abortControllers.delete(requestId);
      
      if (error instanceof Error) {
        if (error.message.includes('aborted')) {
          throw new Error('Enhancement cancelled');
        }
        throw new Error(`Enhancement failed: ${error.message}`);
      }
      throw new Error('Unknown enhancement error');
    }
  }

  cancelRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  generateRequestId(): string {
    return `enhance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export a singleton instance
export const geminiService = new GeminiEnhancementService();
