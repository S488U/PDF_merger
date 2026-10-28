import { create } from 'zustand';
import { PDFDocument } from 'pdf-lib';
import { arrayMove } from '@dnd-kit/sortable';
import type { PageItem, SourceFile, AppSettings, UndoSnapshot } from '@/types/pdf';
import { renderPageThumbnail } from '@/lib/pdf/pdf-renderer';

// Deterministic pastel color palette for file tags
const FILE_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#6366F1', // Indigo
];

function generateColor(index: number): string {
  return FILE_COLORS[index % FILE_COLORS.length];
}

interface PdfState {
  sourceFiles: SourceFile[];
  pages: PageItem[];
  outputName: string;
  settings: AppSettings;
  undoStack: UndoSnapshot[];
  activePreviewPageId: string | null;
  activeSplitPageId: string | null;
  isProcessing: boolean;
  processingMessage: string;
  downloadDirectoryHandle: any | null; // FileSystemDirectoryHandle

  // Actions
  addSourceFiles: (files: { file: File; buffer: ArrayBuffer }[]) => Promise<void>;
  removeSourceFile: (fileId: string) => void;
  reorderPages: (activeId: string, overId: string) => void;
  rotatePage: (pageId: string, delta?: number) => Promise<void>;
  deletePage: (pageId: string) => void;
  splitPage: (pageId: string, splitPositionRatio: number) => Promise<void>;
  filterPages: (filterType: 'all' | 'odd' | 'even' | 'range', rangeStr?: string) => void;
  undo: () => void;
  clearAll: () => void;
  setOutputName: (name: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setActivePreviewPageId: (id: string | null) => void;
  setActiveSplitPageId: (id: string | null) => void;
  setDownloadDirectoryHandle: (handle: any | null) => void;
  getFileBuffer: (fileId: string) => ArrayBuffer | undefined;
}

const DEFAULT_SETTINGS: AppSettings = {
  pattern: 'merged-{date}',
  autoResetAfterMerge: false,
  individualPageSaveAs: false,
  theme: 'dark',
};

// Global memory cache for large file buffers so Zustand doesn't freeze with reactivity overhead
const fileBufferMap = new Map<string, ArrayBuffer>();

export const usePdfStore = create<PdfState>((set, get) => ({
  sourceFiles: [],
  pages: [],
  outputName: 'merged-document.pdf',
  settings: DEFAULT_SETTINGS,
  undoStack: [],
  activePreviewPageId: null,
  activeSplitPageId: null,
  isProcessing: false,
  processingMessage: '',
  downloadDirectoryHandle: null,

  getFileBuffer: (fileId: string) => {
    return fileBufferMap.get(fileId);
  },

  addSourceFiles: async (uploadedFiles) => {
    set({ isProcessing: true, processingMessage: 'Reading PDF documents...' });
    const { sourceFiles, pages, undoStack } = get();

    // Snapshot for undo
    const newUndoStack = [
      ...undoStack.slice(-9), // Keep max 10 undos
      {
        pages: [...pages],
        sourceFiles: [...sourceFiles],
        description: `Add ${uploadedFiles.length} file(s)`,
      },
    ];

    const newSourceFiles: SourceFile[] = [...sourceFiles];
    const newPages: PageItem[] = [...pages];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const { file, buffer } = uploadedFiles[i];
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      fileBufferMap.set(fileId, buffer);

      let pageCount = 0;
      try {
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        pageCount = pdfDoc.getPageCount();
      } catch (err) {
        console.error('Failed to parse PDF document:', err);
        continue;
      }

      const colorCode = generateColor(newSourceFiles.length);
      const sourceFileItem: SourceFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        pageCount,
        colorCode,
      };
      newSourceFiles.push(sourceFileItem);

      for (let pIndex = 0; pIndex < pageCount; pIndex++) {
        const pageId = `${fileId}_p${pIndex}_${Math.random().toString(36).substring(2, 7)}`;
        newPages.push({
          id: pageId,
          fileId,
          fileName: file.name,
          pageIndex: pIndex,
          displayPageNumber: pIndex + 1,
          rotation: 0,
        });
      }
    }

    set({
      sourceFiles: newSourceFiles,
      pages: newPages,
      undoStack: newUndoStack,
      isProcessing: false,
      processingMessage: '',
    });

    // Lazy load thumbnails in background
    for (const page of newPages) {
      if (!page.thumbnailUrl) {
        const buffer = fileBufferMap.get(page.fileId);
        if (buffer) {
          renderPageThumbnail(buffer, page.pageIndex, page.rotation, page.crop)
            .then((thumbnailUrl) => {
              set((state) => ({
                pages: state.pages.map((p) => (p.id === page.id ? { ...p, thumbnailUrl } : p)),
              }));
            })
            .catch((err) => console.error('Thumbnail error:', err));
        }
      }
    }
  },

  removeSourceFile: (fileId: string) => {
    const { sourceFiles, pages, undoStack } = get();
    fileBufferMap.delete(fileId);

    set({
      sourceFiles: sourceFiles.filter((f) => f.id !== fileId),
      pages: pages.filter((p) => p.fileId !== fileId),
      undoStack: [
        ...undoStack.slice(-9),
        { pages: [...pages], sourceFiles: [...sourceFiles], description: 'Remove file' },
      ],
    });
  },

  reorderPages: (activeId: string, overId: string) => {
    const { pages, sourceFiles, undoStack } = get();
    const oldIndex = pages.findIndex((p) => p.id === activeId);
    const newIndex = pages.findIndex((p) => p.id === overId);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    set({
      pages: arrayMove(pages, oldIndex, newIndex),
      undoStack: [
        ...undoStack.slice(-9),
        { pages: [...pages], sourceFiles: [...sourceFiles], description: 'Reorder pages' },
      ],
    });
  },

  rotatePage: async (pageId: string, delta = 90) => {
    const { pages, sourceFiles, undoStack } = get();
    const targetPage = pages.find((p) => p.id === pageId);
    if (!targetPage) return;

    const newRotation = (targetPage.rotation + delta) % 360;
    const updatedPages = pages.map((p) =>
      p.id === pageId ? { ...p, rotation: newRotation, thumbnailUrl: undefined } : p
    );

    set({
      pages: updatedPages,
      undoStack: [
        ...undoStack.slice(-9),
        { pages: [...pages], sourceFiles: [...sourceFiles], description: `Rotate page ${targetPage.displayPageNumber}` },
      ],
    });

    const buffer = fileBufferMap.get(targetPage.fileId);
    if (buffer) {
      const thumbnailUrl = await renderPageThumbnail(buffer, targetPage.pageIndex, newRotation, targetPage.crop);
      set((state) => ({
        pages: state.pages.map((p) => (p.id === pageId ? { ...p, thumbnailUrl } : p)),
      }));
    }
  },

  deletePage: (pageId: string) => {
    const { pages, sourceFiles, undoStack } = get();
    set({
      pages: pages.filter((p) => p.id !== pageId),
      undoStack: [
        ...undoStack.slice(-9),
        { pages: [...pages], sourceFiles: [...sourceFiles], description: 'Delete page' },
      ],
    });
  },

  splitPage: async (pageId: string, splitPositionRatio: number) => {
    const { pages, sourceFiles, undoStack } = get();
    const index = pages.findIndex((p) => p.id === pageId);
    if (index === -1) return;

    const target = pages[index];
    const topSplit = Math.max(0.1, Math.min(0.9, splitPositionRatio));

    const part1: PageItem = {
      ...target,
      id: `${target.id}_top_${Date.now()}`,
      crop: { top: 0, bottom: topSplit },
      sectionLabel: 'Top (Part 1)',
      thumbnailUrl: undefined,
    };

    const part2: PageItem = {
      ...target,
      id: `${target.id}_bot_${Date.now() + 1}`,
      crop: { top: topSplit, bottom: 1 },
      sectionLabel: 'Bottom (Part 2)',
      thumbnailUrl: undefined,
    };

    const newPages = [...pages];
    newPages.splice(index, 1, part1, part2);

    set({
      pages: newPages,
      activeSplitPageId: null,
      undoStack: [
        ...undoStack.slice(-9),
        { pages: [...pages], sourceFiles: [...sourceFiles], description: `Split page ${target.displayPageNumber}` },
      ],
    });

    const buffer = fileBufferMap.get(target.fileId);
    if (buffer) {
      const [thumb1, thumb2] = await Promise.all([
        renderPageThumbnail(buffer, part1.pageIndex, part1.rotation, part1.crop),
        renderPageThumbnail(buffer, part2.pageIndex, part2.rotation, part2.crop),
      ]);
      set((state) => ({
        pages: state.pages.map((p) => {
          if (p.id === part1.id) return { ...p, thumbnailUrl: thumb1 };
          if (p.id === part2.id) return { ...p, thumbnailUrl: thumb2 };
          return p;
        }),
      }));
    }
  },

  filterPages: (filterType: 'all' | 'odd' | 'even' | 'range', rangeStr?: string) => {
    const { pages, sourceFiles, undoStack } = get();
    let filtered: PageItem[] = [];

    if (filterType === 'all') return;

    if (filterType === 'odd') {
      filtered = pages.filter((p) => p.displayPageNumber % 2 !== 0);
    } else if (filterType === 'even') {
      filtered = pages.filter((p) => p.displayPageNumber % 2 === 0);
    } else if (filterType === 'range' && rangeStr) {
      const validNumbers = new Set<number>();
      const parts = rangeStr.split(',');
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
          const [startStr, endStr] = trimmed.split('-');
          const start = parseInt(startStr, 10);
          const end = parseInt(endStr, 10);
          if (!isNaN(start) && !isNaN(end)) {
            for (let num = Math.min(start, end); num <= Math.max(start, end); num++) {
              validNumbers.add(num);
            }
          }
        } else {
          const num = parseInt(trimmed, 10);
          if (!isNaN(num)) validNumbers.add(num);
        }
      }
      filtered = pages.filter((p) => validNumbers.has(p.displayPageNumber));
    }

    if (filtered.length > 0) {
      set({
        pages: filtered,
        undoStack: [
          ...undoStack.slice(-9),
          { pages: [...pages], sourceFiles: [...sourceFiles], description: `Filter pages (${filterType})` },
        ],
      });
    }
  },

  undo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return;
    const lastSnapshot = undoStack[undoStack.length - 1];
    set({
      pages: lastSnapshot.pages,
      sourceFiles: lastSnapshot.sourceFiles,
      undoStack: undoStack.slice(0, -1),
    });
  },

  clearAll: () => {
    const { pages, sourceFiles, undoStack } = get();
    fileBufferMap.clear();
    set({
      pages: [],
      sourceFiles: [],
      undoStack: [
        ...undoStack.slice(-9),
        { pages: [...pages], sourceFiles: [...sourceFiles], description: 'Clear all' },
      ],
    });
  },

  setOutputName: (name: string) => set({ outputName: name }),
  updateSettings: (newSettings: Partial<AppSettings>) =>
    set((state) => ({ settings: { ...state.settings, ...newSettings } })),
  setActivePreviewPageId: (id: string | null) => set({ activePreviewPageId: id }),
  setActiveSplitPageId: (id: string | null) => set({ activeSplitPageId: id }),
  setDownloadDirectoryHandle: (handle: any | null) => set({ downloadDirectoryHandle: handle }),
}));
