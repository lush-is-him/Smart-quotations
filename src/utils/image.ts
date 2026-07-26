/**
 * Resizes an image file to fit within a 250x250 bounding box,
 * detects transparency, and compresses it.
 * - PNG format is used if transparency (alpha channel) is detected.
 * - JPEG format (80% quality) is used otherwise.
 */
export function resizeAndCompressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 250;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2D context from canvas'));
          return;
        }

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Detect alpha channel (transparency)
        let hasAlpha = false;
        try {
          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;
          // Every 4th element is the Alpha channel (R, G, B, A)
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 254) {
              hasAlpha = true;
              break;
            }
          }
        } catch {
          // Fallback if getImageData fails due to security bounds (shouldn't happen for local files)
          hasAlpha = file.type === 'image/png' || file.type === 'image/gif';
        }

        const dataUrl = hasAlpha
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', 0.8);

        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for resizing'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
