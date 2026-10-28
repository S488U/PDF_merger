import { PDFDocument, degrees } from 'pdf-lib';
import type { PageItem } from '@/types/pdf';
import { applyPageCrop } from './crop-helpers';

export async function assemblePdf(
  pages: PageItem[],
  fileBuffers: Map<string, ArrayBuffer>
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  const loadedDocs = new Map<string, PDFDocument>();

  for (const pageItem of pages) {
    let sourceDoc = loadedDocs.get(pageItem.fileId);
    if (!sourceDoc) {
      const buffer = fileBuffers.get(pageItem.fileId);
      if (!buffer) {
        throw new Error(`Missing source buffer for file: ${pageItem.fileName}`);
      }
      sourceDoc = await PDFDocument.load(buffer);
      loadedDocs.set(pageItem.fileId, sourceDoc);
    }

    const [copiedPage] = await mergedPdf.copyPages(sourceDoc, [pageItem.pageIndex]);

    if (pageItem.rotation) {
      const currentRotation = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((currentRotation + pageItem.rotation) % 360));
    }

    if (pageItem.crop) {
      applyPageCrop(copiedPage, pageItem.crop, pageItem.rotation);
    }

    mergedPdf.addPage(copiedPage);
  }

  return await mergedPdf.save();
}

export async function extractSinglePagePdf(
  pageItem: PageItem,
  fileBuffer: ArrayBuffer
): Promise<Uint8Array> {
  const fileBuffers = new Map<string, ArrayBuffer>();
  fileBuffers.set(pageItem.fileId, fileBuffer);
  return await assemblePdf([pageItem], fileBuffers);
}
