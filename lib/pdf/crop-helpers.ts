import { PDFPage } from 'pdf-lib';
import type { CropBox } from '@/types/pdf';

export function applyPageCrop(page: PDFPage, crop?: CropBox, extraRotation = 0) {
  if (!crop) return;

  const box = page.getCropBox();
  const baseRotation = page.getRotation().angle;
  const netRotation = ((baseRotation + extraRotation) % 360 + 360) % 360;

  const isVertical = crop.direction === 'vertical' || (typeof crop.left === 'number' && typeof crop.right === 'number');

  if (isVertical) {
    const left = Math.max(0, Math.min(0.95, crop.left ?? 0));
    const right = Math.max(left + 0.02, Math.min(1, crop.right ?? 1));

    if (netRotation === 0) {
      const cropX = box.x + box.width * left;
      const cropWidth = box.width * (right - left);
      page.setCropBox(cropX, box.y, cropWidth, box.height);
      page.setMediaBox(cropX, box.y, cropWidth, box.height);
    } else if (netRotation === 180) {
      const cropX = box.x + box.width * (1 - right);
      const cropWidth = box.width * (right - left);
      page.setCropBox(cropX, box.y, cropWidth, box.height);
      page.setMediaBox(cropX, box.y, cropWidth, box.height);
    } else if (netRotation === 90) {
      const cropY = box.y + box.height * left;
      const cropHeight = box.height * (right - left);
      page.setCropBox(box.x, cropY, box.width, cropHeight);
      page.setMediaBox(box.x, cropY, box.width, cropHeight);
    } else if (netRotation === 270) {
      const cropY = box.y + box.height * (1 - right);
      const cropHeight = box.height * (right - left);
      page.setCropBox(box.x, cropY, box.width, cropHeight);
      page.setMediaBox(box.x, cropY, box.width, cropHeight);
    }
  } else {
    // Horizontal split (top / bottom)
    const top = Math.max(0, Math.min(0.95, crop.top ?? 0));
    const bottom = Math.max(top + 0.02, Math.min(1, crop.bottom ?? 1));

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
      const cropX = box.x + box.width * top;
      const cropWidth = box.width * (bottom - top);
      page.setCropBox(cropX, box.y, cropWidth, box.height);
      page.setMediaBox(cropX, box.y, cropWidth, box.height);
    } else if (netRotation === 270) {
      const cropX = box.x + box.width * (1 - bottom);
      const cropWidth = box.width * (bottom - top);
      page.setCropBox(cropX, box.y, cropWidth, box.height);
      page.setMediaBox(cropX, box.y, cropWidth, box.height);
    }
  }
}
