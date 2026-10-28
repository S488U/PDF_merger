import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const results = [];

    for (const file of files) {
      if (file.type && !file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPageCount();

      results.push({
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        size: file.size,
        pageCount,
      });
    }

    return NextResponse.json({ files: results });
  } catch (error: any) {
    console.error('Error handling upload:', error);
    return NextResponse.json({ error: error.message || 'Failed to process files' }, { status: 500 });
  }
}
