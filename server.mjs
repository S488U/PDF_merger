import express from "express";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import os from "os"; // Required for Vercel's temporary directory
import { PDFDocument, degrees } from "pdf-lib";

// Vercel requires a writable directory for uploads, which is /tmp
const UPLOADS_DIR = path.join(os.tmpdir(), 'uploads');

// Ensure the temporary uploads directory exists
await fs.mkdir(UPLOADS_DIR, { recursive: true });

const app = express();
// Configure multer to use the temporary directory
const upload = multer({ dest: UPLOADS_DIR });

// Serve the dynamically created uploads from the temporary directory
app.use("/uploads", express.static(UPLOADS_DIR));
app.use(express.json());

// Upload PDFs Endpoint
app.post("/upload", upload.array("pdfs"), async (req, res) => {
  try {
    let pages = [];
    let fileMap = {};
    let fileNames = [];

    for (const file of req.files) {
      const pdfBytes = await fs.readFile(file.path);
      const pdfDoc = await PDFDocument.load(pdfBytes);

      fileNames.push({ filename: file.filename, original: file.originalname });

      for (let i = 0; i < pdfDoc.getPageCount(); i++) {
        const id = `${file.filename}_page_${i}`;
        pages.push({
          id,
          file: file.filename,
          pageIndex: i,
          originalFile: file.originalname,
          originalPage: i + 1,
          rotation: 0,
        });
      }
      fileMap[file.filename] = file.path;
    }

    res.json({ pages, fileMap, fileNames });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: "Failed to process uploaded files." });
  }
});

// Merge PDFs Endpoint
app.post("/merge", async (req, res) => {
  const sourceFilePaths = new Set();
  try {
    const { order, fileMap, newName } = req.body;

    const mergedPdf = await PDFDocument.create();
    const loadedPdfs = new Map();

    for (const pageData of order) {
      const { file, pageIndex, rotation } = pageData;
      let pdfDoc;
      if (loadedPdfs.has(file)) {
        pdfDoc = loadedPdfs.get(file);
      } else {
        const filePath = fileMap[file];
        sourceFilePaths.add(filePath);
        const pdfBytes = await fs.readFile(filePath);
        pdfDoc = await PDFDocument.load(pdfBytes);
        loadedPdfs.set(file, pdfDoc);
      }

      const [copiedPage] = await mergedPdf.copyPages(pdfDoc, [pageIndex]);
      if (rotation) {
        copiedPage.setRotation(degrees(rotation));
      }
      mergedPdf.addPage(copiedPage);
    }

    const pdfBytes = await mergedPdf.save();
    const outName = `${newName || "merged"}.pdf`;
    // Ensure the output path is also in the temporary directory
    const outPath = path.join(UPLOADS_DIR, outName);
    await fs.writeFile(outPath, pdfBytes);

    res.download(outPath, outName, async (err) => {
      if (err) console.error("Download error:", err);
      // Clean up the generated merged PDF
      await fs.unlink(outPath).catch(err => console.error("Error unlinking output:", err));
    });
  } catch (err)
  {
    console.error("Merge Error:", err);
    res.status(500).json({ error: "Failed to merge PDFs." });
  } finally {
    console.log("Cleaning up source files...");
    for (const filePath of sourceFilePaths) {
      await fs.unlink(filePath).catch(err => console.error("Error unlinking source:", err));
    }
  }
});

// Vercel handles the server creation. We just need to export the app.
export default app;