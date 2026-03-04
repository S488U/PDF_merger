# PDF Tools - Smart PDF Merger

Modern web app to merge PDF pages with drag-and-drop ordering, per-page edits, and a fast browser-first workflow.

![PDF Tools Screenshot](https://github.com/S488U/PDF_merger/blob/main/public/screenshot.png)

## Features

- Merge multiple PDFs into one output file
- Page-level reorder with drag-and-drop (desktop + touch-friendly fallback)
- Rotate individual pages in 90-degree steps
- Remove pages or whole source files
- High-resolution page preview modal
- Upload staging area before processing
- Upload progress bar during file transfer
- File-based page filters:
  - Keep odd pages
  - Keep even pages
  - Keep custom ranges (example: `1-3,7,10-12`)
- Undo support for destructive actions (delete/filter/remove file)
- Session restore using local storage (pages, selection, filename)
- Settings panel:
  - Default output name pattern (`merged-{date}` style)
  - Auto-reset after successful merge
- Keyboard shortcuts:
  - Arrow keys to change selected page
  - `R` to rotate selected page
  - `Delete` / `Backspace` to remove selected page
  - `Esc` to close overlays/toasts
- Light/Dark theme toggle with saved preference
- Server-side upload cleanup job for old files
- Filename sanitization on merged output

## Tech Stack

- Frontend: HTML, Tailwind CSS, Vanilla JavaScript
- PDF preview/rendering: `pdf.js`
- Drag and drop: `SortableJS`
- Backend: Node.js + Express
- Upload handling: `multer`
- PDF merge/rotation: `pdf-lib`

## Project Structure

```text
.
├── index.mjs          # Alternate Express entry (local/dev variant)
├── server.mjs         # Main API server used by npm start and Vercel routes
├── vercel.json        # Vercel build + routing config
├── package.json
└── public
    ├── index.html
    ├── script.js
    └── screenshot.png
```

## API Endpoints

- `POST /upload`
  - Accepts multipart field `pdfs`
  - Returns extracted page metadata + server file map
- `POST /merge`
  - Accepts final page order, rotation, and output name
  - Returns merged PDF as downloadable response
- `GET /uploads/:file`
  - Serves temporary uploaded source PDFs for browser-side rendering

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Run

```bash
npm install
npm start
```

Open `http://localhost:3001`.

## Deployment (Vercel)

`vercel.json` is already configured to:

- Serve `public/` as static assets
- Route `/upload`, `/merge`, and `/uploads/*` to `server.mjs`

## Notes

- Temporary uploads are stored in `uploads/` for local runs.
- A periodic cleanup task removes old upload files.
- After merge download, generated output files are deleted automatically.
