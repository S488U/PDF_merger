# 🚀 PDF Tools: Next.js 16 Modernization & Migration Plan

This document outlines the step-by-step architectural migration from the current legacy stack (**Vanilla JS + Express 5 monolith + SortableJS**) to **Next.js 16 (App Router)** with **React 19**, **TypeScript**, **Tailwind CSS**, **Zustand**, and **@dnd-kit**.

---

## 📑 Table of Contents
1. [Executive Summary & Motivation](#1-executive-summary--motivation)
2. [Target Technology Stack (Next.js 16 Ecosystem)](#2-target-technology-stack-nextjs-16-ecosystem)
3. [Architecture Overview & System Design](#3-architecture-overview--system-design)
4. [Target Directory Structure](#4-target-directory-structure)
5. [Step-by-Step Migration Phases](#5-step-by-step-migration-phases)
   - [Phase 1: Project Initialization & Next.js 16 Setup](#phase-1-project-initialization--nextjs-16-setup)
   - [Phase 2: State Management & Store (Zustand)](#phase-2-state-management--store-zustand)
   - [Phase 3: Backend Route Handlers & PDF Engine](#phase-3-backend-route-handlers--pdf-engine)
   - [Phase 4: Component Architecture & UI Migration](#phase-4-component-architecture--ui-migration)
   - [Phase 5: Drag-and-Drop Overhaul with @dnd-kit (Mobile Fix)](#phase-5-drag-and-drop-overhaul-with-dnd-kit-mobile-fix)
   - [Phase 6: Advanced Features & Modals Port](#phase-6-advanced-features--modals-port)
   - [Phase 7: Production Optimization & Vercel Deployment](#phase-7-production-optimization--vercel-deployment)
6. [Critical Bug & Vulnerability Fixes During Migration](#6-critical-bug--vulnerability-fixes-during-migration)
7. [Rollout & Verification Checklist](#7-rollout--verification-checklist)

---

## 1. Executive Summary & Motivation

### Current Bottlenecks
- **58KB Monolithic Client Script (`public/script.js`)**: Imperative DOM manipulation making UI updates, state coordination, and debugging error-prone.
- **Mobile Touch Conflicts**: `SortableJS` triggers accidental card drags on touch devices when tapping thumbnail overlay buttons (Zoom, Rotate, Delete, Download).
- **Stateless Vercel Deployment Breakdown**: The server relies on local disk storage (`/tmp` or `./uploads`) across independent `/upload` and `/merge` invocations, which fails on serverless infrastructure.
- **Path Traversal Security Hole**: Unsanitized `fileMap` allows arbitrary server file read/deletion.
- **Rotated Page Splitting Coordinates Desynchronization**: Interactive split calculations fail when pages are rotated (90°/270°).

### Objectives of Migration
1. **Modularity & Scalability**: Clean component hierarchy with React 19 and Next.js 16 App Router.
2. **Rock-Solid Mobile Touch Drag & Drop**: Using `@dnd-kit/core` and `@dnd-kit/sortable` with explicit touch sensors and drag handles.
3. **Serverless & Local Compatibility**: Resilient file lifecycle using Vercel Blob (or unified multipart streaming) to survive serverless function lifecycles without losing state.
4. **Type-Safety & Performance**: Full TypeScript validation, Turbopack builds (default in Next 16), and zero client runtime CSS compiler overhead.

---

## 2. Target Technology Stack (Next.js 16 Ecosystem)

| Layer | Technology | Selection Rationale |
|---|---|---|
| **Framework** | **Next.js 16 (App Router)** | Turbopack default, React 19.2 support, Server Route Handlers, Cache Components |
| **Package Manager** | **Bun** | Fast installations, native TypeScript execution, compatibility with Node for cloud deployment |
| **Language** | **TypeScript 5.x** | Strict end-to-end type safety across API routes and client state |
| **Styling** | **Tailwind CSS v4 + CSS Variables** | Compiled build-time CSS, dual light/dark mode with glassmorphism |
| **State Store** | **Zustand** | Lightweight, decoupled global state with undo/redo snapshot capabilities |
| **Drag & Drop** | **@dnd-kit** (`core`, `sortable`, `utilities`) | First-class mobile touch sensor support, handle isolation, smooth reordering |
| **PDF Manipulation** | **pdf-lib** | Server/Edge PDF document merging, rotating, cropping, and saving |
| **PDF Preview** | **pdfjs-dist** (Worker) | Lazy canvas rendering and viewport thumbnail generation |
| **Storage / Transport** | **Vercel Blob / Node Buffer Stream** | Serverless-safe ephemeral asset persistence |

---

## 3. Architecture Overview & System Design

```mermaid
graph TD
    A[User Browser / Mobile] -->|Upload PDFs (Multipart)| B[Next.js 16 Route: /api/upload]
    B -->|Parse & Count Pages via pdf-lib| C[Ephemeral Storage / Vercel Blob]
    B -->|Return Page Metadata & IDs| A
    
    A -->|Client Actions in Zustand Store| D[Interactive UI & @dnd-kit Grid]
    D -->|Rotate, Delete, Filter, Reorder| D
    D -->|Split Page Tool (Preview Modal)| D
    
    A -->|Submit Ordered Page Array| E[Next.js 16 Route: /api/merge]
    E -->|Fetch & Group by Source Document| C
    E -->|Batch Copy, Rotate, Crop in Memory| F[pdf-lib Merged Document]
    F -->|Stream Download Response| A
    E -->|Async Cleanup of Source Blobs| C
```

---

## 4. Target Directory Structure

```text
pdfTools/
├── app/
│   ├── api/
│   │   ├── upload/
│   │   │   └── route.ts          # Handles multipart PDF upload & page extraction
│   │   └── merge/
│   │   │   └── route.ts          # Handles server-side PDF assembling & streaming
│   ├── favicon.ico
│   ├── globals.css               # Tailwind v4 theme variables & glassmorphism
│   ├── layout.tsx                # App root layout with font and theme support
│   └── page.tsx                  # Main PDF Studio view
├── components/
│   ├── header/
│   │   ├── Header.tsx            # App branding, ThemeToggle, and Settings menu
│   │   ├── SettingsMenu.tsx      # Default pattern, Auto-reset, Save-as options
│   │   └── ThemeToggle.tsx       # Dark / Light mode switcher
│   ├── upload/
│   │   ├── DropZone.tsx          # Drag & drop upload area with file input
│   │   ├── FileStagingList.tsx   # Pre-upload review list
│   │   └── UploadProgress.tsx    # Upload progress indicators
│   ├── source-files/
│   │   ├── SourceFileList.tsx    # Uploaded files list with badge indicators
│   │   └── PageFilterPanel.tsx   # Filter by odd, even, or custom ranges
│   ├── preview/
│   │   ├── PageGrid.tsx          # @dnd-kit Sortable Context grid container
│   │   ├── PageCard.tsx          # Individual draggable thumbnail card
│   │   └── PageCardActions.tsx   # Mobile-friendly action buttons / menu
│   ├── modals/
│   │   ├── PreviewModal.tsx      # Accessible dialog for high-res preview
│   │   └── SplitTool.tsx         # Interactive horizontal page split canvas
│   ├── footer/
│   │   └── StickyActionFooter.tsx# Output name input & "Download Merged PDF" CTA
│   └── ui/
│       ├── ToastContainer.tsx    # Success, error, and undo toast notification system
│       └── WalkthroughCard.tsx   # Dismissible 3-step quick start guide
├── hooks/
│   ├── usePdfRenderer.ts         # Lazy PDF.js thumbnail generation with queue
│   └── useKeyboardShortcuts.ts   # Keyboard navigation (Arrows, R, Del, Alt+Arrow)
├── lib/
│   ├── pdf/
│   │   ├── pdf-server.ts         # Server-side pdf-lib operations (merge, crop, rotate)
│   │   ├── pdf-client.ts         # Client-side PDF.js worker setup & utilities
│   │   └── crop-helpers.ts       # Coordinate normalization & rotation compensation
│   ├── storage/
│   │   ├── blob-storage.ts       # Vercel Blob / temp file storage abstractions
│   │   └── indexeddb.ts          # File System Access API handle caching
│   └── store/
│       └── usePdfStore.ts        # Zustand global store with undo snapshot stack
├── types/
│   ├── pdf.ts                    # PageItem, SourceFile, CropBox, MergePayload
│   └── store.ts                  # Zustand state & action definitions
├── next.config.ts                # Next.js 16 configuration (Cache Components, Turbopack)
├── package.json
├── tsconfig.json
└── README.md
```

---

## 5. Step-by-Step Migration Phases

### Phase 1: Project Initialization & Next.js 16 Setup
1. **Initialize Next.js 16**:
   ```bash
   bun create next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias="@/*"
   ```
2. **Install Core Dependencies**:
   ```bash
   bun add zustand @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities pdf-lib pdfjs-dist @vercel/blob lucide-react
   bun add -D @types/pdfjs-dist
   ```
3. **Configure `next.config.ts`**:
   - Enable Next 16 Cache Components and Turbopack optimizations.
   - Configure webpack / Turbopack aliases for `pdfjs-dist` worker support.

### Phase 2: State Management & Store (Zustand)
1. **Define Strict TypeScript Interfaces (`types/pdf.ts`)**:
   - `PageItem`: `id`, `fileId`, `originalFile`, `pageIndex`, `originalPage`, `rotation`, `crop?` (`{ top: number, bottom: number }`), `thumbnailUrl?`.
   - `SourceFile`: `id`, `name`, `size`, `pageCount`, `colorCode`, `blobUrl`.
2. **Build `usePdfStore.ts`**:
   - Centralize state: `pages`, `sourceFiles`, `selectedPageId`, `outputName`, `settings`, `undoHistory`.
   - Implement immutable action mutators: `addPages`, `reorderPages`, `rotatePage`, `deletePage`, `filterPages`, `splitPage`.
   - Implement `snapshotHistory()` / `undoLastAction()` with 5-second automatic timeout.

### Phase 3: Backend Route Handlers & PDF Engine
1. **Migrate `/api/upload` (`app/api/upload/route.ts`)**:
   - Use Next.js 16 Web Request API with `formData()`.
   - Validate MIME types (`application/pdf`) and file sizes (enforce max limit).
   - Read PDF bytes with `pdf-lib`, compute page counts, store temporarily in Vercel Blob (or secure server temp memory), and return structured page metadata.
2. **Migrate `/api/merge` (`app/api/merge/route.ts`)**:
   - Receive verified `order` array, crop coordinates, and rotations.
   - Group pages by source document to minimize I/O.
   - Accurately compute cumulative rotations: `(page.getRotation().angle + requestedRotation) % 360`.
   - Apply setCropBox / setMediaBox with coordinate clipping safeguards.
   - Stream the output `Uint8Array` back to client with sanitized `Content-Disposition` headers.
   - Trigger async cleanup of ephemeral source files.

### Phase 4: Component Architecture & UI Migration
1. **Port Design System & Global Styles**:
   - Port CSS custom properties (`--bg`, `--surface`, `--border`, `--text`, `--accent`) to `app/globals.css`.
   - Maintain dark/light mode toggle with smooth theme transition.
2. **Build Header & Settings Components**:
   - `Header.tsx`, `ThemeToggle.tsx`, `SettingsMenu.tsx` (pattern configuration, auto-reset, File System Access folder handle integration).
3. **Build Source Management & Filter Panel**:
   - `SourceFileList.tsx` with deterministic color badges.
   - `PageFilterPanel.tsx` supporting `All`, `Odd`, `Even`, and custom ranges (e.g., `1-3, 7`).
4. **Build Sticky Footer**:
   - `StickyActionFooter.tsx` with automatic naming resolution (`merged-{date}`) and download triggering.

### Phase 5: Drag-and-Drop Overhaul with @dnd-kit (Mobile Fix)
1. **Configure Sensors in `PageGrid.tsx`**:
   ```typescript
   const sensors = useSensors(
     useSensor(PointerSensor, {
       activationConstraint: { distance: 5 },
     }),
     useSensor(TouchSensor, {
       activationConstraint: {
         delay: 200,
         tolerance: 6,
       },
     }),
     useSensor(KeyboardSensor, {
       coordinateGetter: sortableKeyboardCoordinates,
     })
   );
   ```
2. **Implement Isolated Drag Handle in `PageCard.tsx`**:
   - Restrict drag triggers to the explicit `drag-handle` grip element or card body while giving overlay action buttons (`onClick`, `stopPropagation`) dedicated hit targets.
   - On mobile viewports (<640px), show a clean card layout with a dropdown action menu ("⋮") to prevent cramped overlay buttons.
3. **Accessibility**:
   - Enable full keyboard reordering (`Alt + ArrowLeft` / `Alt + ArrowRight` or focused keyboard dragging).

### Phase 6: Advanced Features & Modals Port
1. **High-Res Preview & Split Tool (`SplitTool.tsx`)**:
   - Render page canvas at high resolution using `pdfjs-dist`.
   - Fix coordinate calculation for rotated pages: un-rotate the interaction plane before calculating normalized `top` and `bottom` split ratios.
   - Add accessible slider and drag line controls.
2. **Toast System & Focus Trapping**:
   - Add `role="dialog"` and focus trapping to `PreviewModal.tsx`.
   - Render non-intrusive toasts with auto-dismiss and undo triggers.

### Phase 7: Production Optimization & Vercel Deployment
1. **Turbopack Build Validation**:
   - Verify `bun run build` generates clean output with zero warnings.
2. **Vercel Deployment**:
   - Zero-config deployment via native Next.js 16 App Router support (no manual `vercel.json` routing hacks).

---

## 6. Critical Bug & Vulnerability Fixes During Migration

| Component / File | Previous Issue | Next.js 16 Solution |
|---|---|---|
| **`/api/merge`** | Path traversal via untrusted `fileMap` | In-memory / Blob identifier validation with strict whitelist |
| **`/api/upload`** | Stateless container file disappearance | Vercel Blob persistence / direct serverless streaming |
| **`PageCard` (Mobile)** | Touch drag conflicting with action buttons | `@dnd-kit` touch sensor delay + isolated drag handles |
| **`SplitTool`** | Incorrect crop on rotated pages (90°/270°) | Rotation matrix normalization in `crop-helpers.ts` |
| **Session Restore** | Broken thumbnails on purged server files | Fallback re-upload indicator and clear stale cache |
| **Modal UI** | Lack of focus trapping & dialog a11y | Accessible Radix/Headless Dialog semantics with keyboard trap |

---

## 7. Rollout & Verification Checklist

- [x] **Milestone 1**: Next.js 16 App Router initialized with TypeScript and Tailwind CSS.
- [x] **Milestone 2**: Zustand store implemented with full undo snapshot capability.
- [x] **Milestone 3**: `/api/upload` and `/api/merge` route handlers tested and secured.
- [x] **Milestone 4**: Page thumbnail rendering pipeline operational with lazy PDF.js workers.
- [x] **Milestone 5**: `@dnd-kit` drag-and-drop tested on both desktop mouse and mobile touch devices.
- [x] **Milestone 6**: Page rotation, deletion, filtering, and splitting fully functional.
- [x] **Milestone 7**: File System Access API and browser download flows verified.
- [x] **Milestone 8**: Production build (`bun run build`) passing with Turbopack.
- [ ] **Milestone 9**: Deployment to Vercel tested with end-to-end multi-page merge.
