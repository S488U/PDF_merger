import type { CropBox } from '@/types/pdf';

let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfJs() {
  if (typeof window === 'undefined') return null;
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }
  }
  return pdfjsLib;
}

export async function renderPageThumbnail(
  buffer: ArrayBuffer,
  pageIndex: number, // 0-based
  rotation: number = 0,
  crop?: CropBox,
  scale: number = 0.6
): Promise<string> {
  const pdfjs = await getPdfJs();
  if (!pdfjs) return '';

  const loadingTask = pdfjs.getDocument({ data: buffer.slice(0) });
  const doc = await loadingTask.promise;
  const page = await doc.getPage(pageIndex + 1);

  // Total rotation including native page rotation
  const totalRotation = ((page.rotate + rotation) % 360 + 360) % 360;
  const viewport = page.getViewport({ scale, rotation: totalRotation });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  }).promise;

  if (crop) {
    const isVertical = crop.direction === 'vertical' || (typeof crop.left === 'number' && typeof crop.right === 'number');

    if (isVertical) {
      const left = Math.max(0, Math.min(0.95, crop.left ?? 0));
      const right = Math.max(left + 0.05, Math.min(1, crop.right ?? 1));

      const cropX = canvas.width * left;
      const cropWidth = canvas.width * (right - left);

      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = cropWidth;
      croppedCanvas.height = canvas.height;
      const croppedCtx = croppedCanvas.getContext('2d');
      if (croppedCtx) {
        croppedCtx.drawImage(
          canvas,
          cropX,
          0,
          cropWidth,
          canvas.height,
          0,
          0,
          cropWidth,
          canvas.height
        );
        return croppedCanvas.toDataURL('image/jpeg', 0.85);
      }
    } else if (typeof crop.top === 'number' && typeof crop.bottom === 'number') {
      const top = Math.max(0, Math.min(0.95, crop.top));
      const bottom = Math.max(top + 0.05, Math.min(1, crop.bottom));

      const cropY = canvas.height * top;
      const cropHeight = canvas.height * (bottom - top);

      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = canvas.width;
      croppedCanvas.height = cropHeight;
      const croppedCtx = croppedCanvas.getContext('2d');
      if (croppedCtx) {
        croppedCtx.drawImage(
          canvas,
          0,
          cropY,
          canvas.width,
          cropHeight,
          0,
          0,
          canvas.width,
          cropHeight
        );
        return croppedCanvas.toDataURL('image/jpeg', 0.85);
      }
    }
  }

  return canvas.toDataURL('image/jpeg', 0.85);
}

export async function renderHighResPage(
  buffer: ArrayBuffer,
  pageIndex: number,
  rotation: number = 0,
  scale: number = 1.6
): Promise<{ dataUrl: string; width: number; height: number }> {
  const pdfjs = await getPdfJs();
  if (!pdfjs) return { dataUrl: '', width: 0, height: 0 };

  const loadingTask = pdfjs.getDocument({ data: buffer.slice(0) });
  const doc = await loadingTask.promise;
  const page = await doc.getPage(pageIndex + 1);

  const totalRotation = ((page.rotate + rotation) % 360 + 360) % 360;
  const viewport = page.getViewport({ scale, rotation: totalRotation });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: '', width: 0, height: 0 };

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  }).promise;

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: viewport.width,
    height: viewport.height,
  };
}
