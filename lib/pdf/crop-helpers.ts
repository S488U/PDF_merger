import { PDFPage } from 'pdf-lib';
import type { CropBox } from '@/types/pdf';

export function applyPageCrop(page: PDFPage, crop?: CropBox, extraRotation = 0) {
  if (!crop || typeof crop.top !== 'number' || typeof crop.bottom !== 'number') return;

  const top = Math.max(0, Math.min(0.95, crop.top));
  const bottom = Math.max(top + 0.05, Math.min(1, crop.bottom));

  const box = page.getCropBox();
  const baseRotation = page.getRotation().angle;
  const netRotation = ((baseRotation + extraRotation) % 360 + 360) % 360;

  // Visual split is always horizontal across the screen.
  // In PDF coordinate space, the origin (0,0) is bottom-left.
  if (netRotation === 0) {
    const cropY = box.y + box.height * (1 - bottom);
    const cropHeight = box.height * (bottom - top);
    page.setCropBox(box.x, cropY, box.width, cropHeight);
    page.setMediaBox(box.x, cropY, box.width, cropHeight);
  } else if (netRotation === 180) {
    const cropY = box.y + box.height * top;
    const cropHeight = box.height * (bottom - top);
    page.setCropBox(box.x, cropY, box.width, cropHeight);
    page.setMediaBox(box.x, cropY, box.width, cropHeight);
  } else if (netRotation === 90) {
    // When rotated 90° clockwise, visual top is PDF right, visual bottom is PDF left.
    const cropX = box.x + box.width * top;
    const cropWidth = box.width * (bottom - top);
    page.setCropBox(cropX, box.y, cropWidth, box.height);
    page.setMediaBox(cropX, box.y, cropWidth, box.height);
  } else if (netRotation === 270) {
    // When rotated 270° clockwise, visual top is PDF left, visual bottom is PDF right.
    const cropX = box.x + box.width * (1 - bottom);
    const cropWidth = box.width * (bottom - top);
    page.setCropBox(cropX, box.y, cropWidth, box.height);
    page.setMediaBox(cropX, box.y, cropWidth, box.height);
  }
}
