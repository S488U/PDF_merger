import express from "express";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument, degrees } from "pdf-lib";

// --- SETUP ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. CONFIGURATION
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB Limit
const UPLOAD_DIR = path.join(__dirname, "uploads");

// Ensure upload directory exists
await fs.mkdir(UPLOAD_DIR, { recursive: true });

// 2. MULTER SETUP (Disk Storage)
// We use Disk Storage because loading 100MB PDFs into RAM (MemoryStorage) 
// causes Node.js to crash. Disk is slower but stable.
const upload = multer({ 
  dest: "uploads/",
  limits: { fileSize: MAX_FILE_SIZE } 
});

// 3. MIDDLEWARE
app.use(express.static("public"));
app.use("/uploads", express.static(UPLOAD_DIR)); // Serve uploaded thumbnails
app.use(express.json({ limit: "10mb" })); // Allow large JSON payloads for merge order

// --- AUTOMATIC CLEANUP TASK ---
// Runs every 1 hour. Deletes files older than 1 hour.
setInterval(async () => {
  try {
    const files = await fs.readdir(UPLOAD_DIR);
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;

    for (const file of files) {
      if (file === ".gitkeep") continue; 
      const filePath = path.join(UPLOAD_DIR, file);
      
      // Check file age
      const stats = await fs.stat(filePath).catch(() => null);
      if (stats && (now - stats.mtimeMs > ONE_HOUR)) {
        await fs.unlink(filePath).catch(() => {});
        console.log(`🧹 Auto-cleaned: ${file}`);
      }
    }
  } catch (err) {
    console.error("Cleanup error:", err);
  }
}, 60 * 60 * 1000); 

// --- ROUTES ---

// 1. UPLOAD ENDPOINT
// Wrapped to handle "File Too Large" errors without crashing
app.post("/upload", (req, res) => {
  const uploadMiddleware = upload.array("pdfs");

  uploadMiddleware(req, res, async (err) => {
    // A. Handle Multer Errors
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: `File too large. Max limit is ${MAX_FILE_SIZE / 1024 / 1024}MB.` });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(500).json({ error: "Unknown upload error." });
    }

    // B. Process Files (Only if upload succeeded)
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded." });
    }

    try {
      let pages = [];
      let fileMap = {};
      let fileNames = [];

      for (const file of req.files) {
        try {
          const pdfBytes = await fs.readFile(file.path);
          // Load PDF to count pages. Ignore encryption if possible to just read metadata.
          const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
          
          fileNames.push({ filename: file.filename, original: file.originalname });
          fileMap[file.filename] = file.path;

          const count = pdfDoc.getPageCount();
          for (let i = 0; i < count; i++) {
            pages.push({
              id: `${file.filename}_page_${i}`,
              file: file.filename,
              pageIndex: i,
              originalFile: file.originalname,
              originalPage: i + 1,
              rotation: 0, 
            });
          }
        } catch (e) {
          console.error(`Skipping corrupt file ${file.originalname}:`, e);
          // Delete corrupt file immediately to save space
          await fs.unlink(file.path).catch(() => {});
        }
      }
      res.json({ pages, fileMap, fileNames });
    } catch (procErr) {
      console.error("Processing Error:", procErr);
      res.status(500).json({ error: "Failed to process uploaded PDFs." });
    }
  });
});

// 2. MERGE ENDPOINT
app.post("/merge", async (req, res) => {
  let outPath = null;
  try {
    const { order, fileMap, newName } = req.body;

    if (!order || !Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ error: "Invalid merge order." });
    }

    const mergedPdf = await PDFDocument.create();
    
    // Group pages by source file to reduce disk I/O (Read file once, copy multiple pages)
    const fileGroups = {};
    order.forEach((item, index) => {
      if (!fileGroups[item.file]) fileGroups[item.file] = [];
      fileGroups[item.file].push({ ...item, finalOrderIndex: index });
    });

    const finalPages = new Array(order.length);

    // Process each source file
    for (const [filename, requestedPages] of Object.entries(fileGroups)) {
      const filePath = fileMap[filename];
      
      // Security: Verify file exists
      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`Source file missing: ${filename}. Please re-upload.`);
      }

      const pdfBytes = await fs.readFile(filePath);
      const srcDoc = await PDFDocument.load(pdfBytes);
      
      const indicesToCopy = requestedPages.map(p => p.pageIndex);
      const copiedPages = await mergedPdf.copyPages(srcDoc, indicesToCopy);

      requestedPages.forEach((reqPage, i) => {
        const page = copiedPages[i];
        
        // Apply rotation logic
        if (reqPage.rotation) {
          const currentRotation = page.getRotation().angle;
          page.setRotation(degrees(currentRotation + reqPage.rotation));
        }
        
        finalPages[reqPage.finalOrderIndex] = page;
      });
    }

    // Add pages in correct order
    for (const page of finalPages) {
      if (page) mergedPdf.addPage(page);
    }

    // SANITIZATION: Remove dangerous characters from filename
    const safeName = (newName || "merged").replace(/[^a-zA-Z0-9-_]/g, "").substring(0, 50);
    const outputFilename = `${safeName}_${Date.now()}.pdf`;
    outPath = path.join(UPLOAD_DIR, outputFilename);
    
    const pdfBytes = await mergedPdf.save();
    await fs.writeFile(outPath, pdfBytes);

    // Send file and delete it after download
    res.download(outPath, `${safeName}.pdf`, async (err) => {
      if (err) console.error("Download error:", err);
      // Delete the generated merged file immediately.
      // Source files remain until the 1-hour auto-cleanup or manual reset.
      await fs.unlink(outPath).catch(e => console.error(e));
    });

  } catch (err) {
    console.error("Merge Error:", err);
    if (outPath) await fs.unlink(outPath).catch(() => {});
    res.status(500).json({ error: err.message || "Failed to merge PDFs." });
  }
});

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);