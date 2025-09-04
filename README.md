# 📑 PDF Merger Tool

A fast, lightweight, and modern web application for merging multiple PDF files. This tool allows users to upload documents, reorder pages with a simple drag-and-drop interface, rotate individual pages, and merge them into a single PDF file.

The application is built with a high-performance, cost-effective hybrid architecture, optimized for deployment on serverless platforms like Vercel.

![PDF Merger Screenshot](https://github.com/S488U/PDF_merger/blob/main/public/Screenshot.png)

---

## ✨ Features

-   **Merge Multiple PDFs:** Upload and combine several PDF files into one.
-   **Drag & Drop Reordering:** Intuitively reorder all pages from all uploaded documents.
-   **Page Rotation:** Rotate individual pages by 90-degree increments.
-   **High-Resolution Preview:** Zoom in on any page with a modal preview to see its content clearly.
-   **Real-time Upload Progress:** A progress bar provides visual feedback for large file uploads.
-   **Mobile Responsive:** A clean, usable interface on both desktop and mobile devices.
-   **Efficient & Fast:** Optimized architecture ensures fast load times and quick processing.
-   **Serverless Ready:** Designed from the ground up for easy and efficient deployment on Vercel.

---

## 🔧 Tech Stack

-   **Frontend:**
    -   HTML5 & Tailwind CSS
    -   Vanilla JavaScript (ES Modules)
    -   [**pdf.js**](https://mozilla.github.io/pdf.js/) for client-side page rendering (thumbnails and previews).
    -   [**SortableJS**](https://github.com/SortableJS/Sortable) for drag-and-drop functionality.
-   **Backend:**
    -   Node.js
    -   Express.js
    -   [**multer**](https://github.com/expressjs/multer) for handling file uploads.
    -   [**pdf-lib**](https://pdf-lib.js.org/) for the core PDF manipulation (merging and rotation) on the server.
-   **Deployment:**
    -   Vercel

---

## 🚀 How It Works: The Processing Method

This application uses a highly efficient **hybrid architecture** that splits the workload between the server and the browser to maximize performance and minimize cost.

#### The Architecture
-   **Static Frontend (Vercel Edge Network):** The user interface (HTML, CSS, JS) is served as a static site. This makes the initial page load incredibly fast.
-   **Serverless Backend (Node.js Function):** The server-side logic (`/upload`, `/merge`) runs as a lightweight serverless function that only executes when needed.

#### The Workflow Step-by-Step

1.  **File Upload (`/upload`)**:
    -   The user selects files, which are sent to the serverless backend.
    -   The server **does not process any images**. It simply saves the raw PDF to Vercel's temporary `/tmp` directory.
    -   It quickly inspects the PDF to get the page count and sends a simple JSON list of all pages back to the browser. This process is extremely fast and uses minimal server resources.

2.  **Thumbnail Generation (In the Browser)**:
    -   This is the key to the app's performance. The browser receives the list of pages.
    -   Using `pdf.js`, it fetches the raw PDF from the server's temporary storage **only once per file**.
    -   It then generates all the low-resolution thumbnails for that file directly in the browser's memory, updating the UI progressively. This offloads the most CPU-intensive work from the server to the client.

3.  **User Interaction (Entirely in the Browser)**:
    -   **Reordering, rotating, deleting, and previewing** pages are all handled instantly by the frontend JavaScript. No server communication is needed, making the UI feel snappy and responsive.
    -   The high-resolution preview is also generated on-demand in the browser.

4.  **Merging & Download (`/merge`)**:
    -   When the user clicks "Merge", the final ordered list of pages (including their rotation data) is sent to the serverless backend.
    -   The server function wakes up, reads the necessary source PDFs from `/tmp`, and uses `pdf-lib` to build the final PDF in memory, applying the correct page order and rotation.
    -   The newly created PDF is streamed back to the user for download.

5.  **Automatic Cleanup**:
    -   After the download is complete, the server function deletes all temporary files (both the original uploads and the final merged PDF) from the `/tmp` directory, ensuring the environment is left clean.

---

## 📁 Project Structure

```
.
├── package.json        # Project dependencies
├── vercel.json         # Vercel deployment and routing configuration
├── server.mjs          # The Node.js serverless API
├── index.mjs           # The Express.js API
└── public
    ├── index.html      # Main application HTML
    └── script.js       # All frontend logic
```

---

## 🏁 Getting Started (Local Development)

To run this project on your local machine:

#### Prerequisites
-   [Node.js](https://nodejs.org/) (v18 or newer recommended)
-   npm (comes with Node.js)

#### Installation & Running

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/S488U/PDF_merger.git
    cd PDF_merger
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the local server:**
    ```bash
    npm start
    ```

4.  Open your browser and navigate to `http://localhost:3000`.

---

## 🌐 Deployment

This project is pre-configured for a zero-effort deployment to [**Vercel**](https://vercel.com/).

> This web application is vibe coded. 