import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, degrees } from 'pdf-lib';
import { applyPageCrop } from '@/lib/pdf/crop-helpers';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const orderStr = formData.get('order') as string;
    if (!orderStr) {
      return NextResponse.json({ error: 'Missing merge order instructions' }, { status: 400 });
    }

    const order = JSON.parse(orderStr);
    const files = formData.getAll('files') as File[];
    const fileMap = new Map<string, ArrayBuffer>();

    for (const file of files) {
      fileMap.set(file.name, await file.arrayBuffer());
    }

    const mergedPdf = await PDFDocument.create();
    const loadedDocs = new Map<string, PDFDocument>();

    for (const pageReq of order) {
      let doc = loadedDocs.get(pageReq.fileName);
      if (!doc) {
        const buffer = fileMap.get(pageReq.fileName);
        if (!buffer) {
          throw new Error(`Missing file payload for: ${pageReq.fileName}`);
        }
        doc = await PDFDocument.load(buffer);
        loadedDocs.set(pageReq.fileName, doc);
      }

      const [copiedPage] = await mergedPdf.copyPages(doc, [pageReq.pageIndex]);

      if (pageReq.rotation) {
        const currentAngle = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees((currentAngle + pageReq.rotation) % 360));
      }

      if (pageReq.crop) {
        applyPageCrop(copiedPage, pageReq.crop, pageReq.rotation);
      }

      mergedPdf.addPage(copiedPage);
    }

    const pdfBytes = await mergedPdf.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="merged-document.pdf"',
      },
    });
  } catch (error: any) {
    console.error('Error in /api/merge:', error);
    return NextResponse.json({ error: error.message || 'Merge failed' }, { status: 500 });
  }
}
