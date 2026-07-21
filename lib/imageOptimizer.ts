// ========================================================
// StayDesk CRM / HotelFlow CRM Client-Side Image Optimizer
// Location: lib/imageOptimizer.ts
// ========================================================

/**
 * Optimizes an image file client-side by resizing, converting to WebP,
 * stripping EXIF data, and compressing to target sizes.
 * 
 * @param file Original file
 * @param type Target category
 * @returns Promise with optimized Blob and base64 Data URL
 */
export async function optimizeImage(
  file: File,
  type: 'document' | 'room' | 'logo'
): Promise<{ dataUrl: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Only image files are supported'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let maxWidth = 1600;
        let quality = 0.8;
        
        if (type === 'room') {
          maxWidth = 1920;
          quality = 0.85;
        } else if (type === 'logo') {
          maxWidth = 512;
          quality = 0.8;
        }

        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio while constraining width
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas 2D context'));
          return;
        }

        // Draw image onto canvas (automatically auto-rotates in modern browsers and strips EXIF)
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP format with specified quality compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Image compression failed'));
              return;
            }

            const webpReader = new FileReader();
            webpReader.onloadend = () => {
              resolve({
                dataUrl: webpReader.result as string,
                blob
              });
            };
            webpReader.onerror = () => reject(new Error('Failed to read WebP blob'));
            webpReader.readAsDataURL(blob);
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image resource'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}
