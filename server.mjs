// server.mjs (Updated)

import express from "express";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument, degrees } from "pdf-lib"; // ✨ FEATURE: Import 'degrees' for rotation

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.json());

// [ ... /upload endpoint is unchanged ... ]
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
          rotation: 0, // ✨ FEATURE: Add rotation property to the page object
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


// Merge PDFs
app.post("/merge", async (req, res) => {
  const sourceFilePaths = new Set();
  try {
    const { order, fileMap, newName } = req.body;

    const mergedPdf = await PDFDocument.create();
    const loadedPdfs = new Map();

    for (const pageData of order) { // ✨ FEATURE: Renamed to pageData for clarity
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

      // ✨ FEATURE: Apply the specified rotation if it's not 0
      if (rotation) {
        copiedPage.setRotation(degrees(rotation));
      }

      mergedPdf.addPage(copiedPage);
    }

    const pdfBytes = await mergedPdf.save();
    const outName = `${newName || "merged"}.pdf`;
    const outPath = path.join(__dirname, "uploads", outName);
    await fs.writeFile(outPath, pdfBytes);

    res.download(outPath, outName, async (err) => {
      if (err) console.error("Download error:", err);
      await fs.unlink(outPath).catch(err => console.error("Error unlinking output:", err));
    });
  } catch (err) {
    console.error("Merge Error:", err);
    res.status(500).json({ error: "Failed to merge PDFs." });
  } finally {
    console.log("Cleaning up source files...");
    for (const filePath of sourceFilePaths) {
      await fs.unlink(filePath).catch(err => console.error("Error unlinking source:", err));
    }
  }
});

app.listen(3000, () =>
  console.log("🚀 Server running at http://localhost:3000")
);  