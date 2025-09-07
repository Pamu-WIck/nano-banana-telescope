import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CropArea } from '../types/enhancement';
import { cropImageFromCanvas } from '../utils/viewport';

const GEMINI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;

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
          
          // Return as data URL
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
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
