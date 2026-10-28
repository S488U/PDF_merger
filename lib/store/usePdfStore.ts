import { create } from 'zustand';
import { PDFDocument } from 'pdf-lib';
import { arrayMove } from '@dnd-kit/sortable';
import type { PageItem, SourceFile, AppSettings, UndoSnapshot, ToastNotification, GridDensity } from '@/types/pdf';
import { renderPageThumbnail } from '@/lib/pdf/pdf-renderer';

// Refined, color-accessible deterministic palette for document badges
const FILE_COLORS = [
  '#2563EB', // Blue
  '#059669', // Emerald
  '#7C3AED', // Violet
  '#D97706', // Amber
  '#DB2777', // Pink
  '#0891B2', // Cyan
  '#EA580C', // Orange
  '#4F46E5', // Indigo
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
  redoStack: UndoSnapshot[];
  toasts: ToastNotification[];
  selectedPageIds: string[];
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
  rotateSelectedPages: (delta?: number) => Promise<void>;
  deletePage: (pageId: string) => void;
  deleteSelectedPages: () => void;
  splitPage: (pageId: string, splitPositionRatio: number, direction?: 'horizontal' | 'vertical') => Promise<void>;
  filterPages: (filterType: 'all' | 'odd' | 'even' | 'range', rangeStr?: string) => void;
  togglePageSelection: (pageId: string, multiSelect?: boolean) => void;
  selectAllPages: () => void;
  clearSelection: () => void;
  undo: () => void;
  redo: () => void;
  clearAll: () => void;
  setOutputName: (name: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setActivePreviewPageId: (id: string | null) => void;
  setActiveSplitPageId: (id: string | null) => void;
  setDownloadDirectoryHandle: (handle: any | null) => void;
  addToast: (message: string, type?: ToastNotification['type'], duration?: number) => void;
  removeToast: (id: string) => void;
  getFileBuffer: (fileId: string) => ArrayBuffer | undefined;
}

const DEFAULT_SETTINGS: AppSettings = {
  pattern: 'merged-{date}',
  autoResetAfterMerge: false,
  individualPageSaveAs: false,
  theme: 'dark',
  gridDensity: 'comfortable',
};

// Global memory cache for large file buffers so Zustand doesn't freeze with reactivity overhead
const fileBufferMap = new Map<string, ArrayBuffer>();

export const usePdfStore = create<PdfState>((set, get) => ({
  sourceFiles: [],
  pages: [],
  outputName: 'merged-document.pdf',
  settings: DEFAULT_SETTINGS,
  undoStack: [],
  redoStack: [],
  toasts: [],
  selectedPageIds: [],
  activePreviewPageId: null,
  activeSplitPageId: null,
  isProcessing: false,
  processingMessage: '',
  downloadDirectoryHandle: null,

  getFileBuffer: (fileId: string) => {
    return fileBufferMap.get(fileId);
  },

  addToast: (message: string, type = 'info', duration = 3500) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastNotification = { id, message, type, timestamp: Date.now() };

    set((state) => ({
      toasts: [...state.toasts.slice(-4), newToast],
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  addSourceFiles: async (uploadedFiles) => {
    set({ isProcessing: true, processingMessage: `Processing ${uploadedFiles.length} file(s)...` });
    const { sourceFiles, pages, undoStack } = get();

    // Snapshot for undo
    const newUndoStack = [
      ...undoStack.slice(-14),
      {
        pages: [...pages],
        sourceFiles: [...sourceFiles],
        description: `Import ${uploadedFiles.length} file(s)`,
      },
    ];

    const newSourceFiles: SourceFile[] = [...sourceFiles];
    const newPages: PageItem[] = [...pages];
    let newlyAddedPageCount = 0;

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
      newlyAddedPageCount += pageCount;

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
      redoStack: [],
      isProcessing: false,
      processingMessage: '',
    });

    get().addToast(`Imported ${uploadedFiles.length} file(s) with ${newlyAddedPageCount} total pages`, 'success');

    // Asynchronously render thumbnails
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
    const file = sourceFiles.find((f) => f.id === fileId);
    fileBufferMap.delete(fileId);

    set({
      sourceFiles: sourceFiles.filter((f) => f.id !== fileId),
      pages: pages.filter((p) => p.fileId !== fileId),
      selectedPageIds: get().selectedPageIds.filter(
        (id) => !pages.find((p) => p.id === id && p.fileId === fileId)
      ),
      undoStack: [
        ...undoStack.slice(-14),
        { pages: [...pages], sourceFiles: [...sourceFiles], description: `Remove file ${file?.name || ''}` },
      ],
      redoStack: [],
    });

    get().addToast(`Removed ${file?.name || 'file'}`, 'info');
  },

  reorderPages: (activeId: string, overId: string) => {
    const { pages, sourceFiles, undoStack } = get();
    const oldIndex = pages.findIndex((p) => p.id === activeId);
    const newIndex = pages.findIndex((p) => p.id === overId);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    set({
      pages: arrayMove(pages, oldIndex, newIndex),
      undoStack: [
        ...undoStack.slice(-14),
        { pages: [...pages], sourceFiles: [...sourceFiles], description: 'Reorder pages' },
      ],
      redoStack: [],
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
        ...undoStack.slice(-14),
        { pages: [...pages], sourceFiles: [...sourceFiles], description: `Rotate page ${targetPage.displayPageNumber}` },
      ],
      redoStack: [],
    });

    const buffer = fileBufferMap.get(targetPage.fileId);
    if (buffer) {
      const thumbnailUrl = await renderPageThumbnail(buffer, targetPage.pageIndex, newRotation, targetPage.crop);
      set((state) => ({
        pages: state.pages.map((p) => (p.id === pageId ? { ...p, thumbnailUrl } : p)),
      }));
    }
  },

  rotateSelectedPages: async (delta = 90) => {
    const { pages, sourceFiles, undoStack, selectedPageIds } = get();
    if (selectedPageIds.length === 0) return;

    const selectedSet = new Set(selectedPageIds);
    const updatedPages = pages.map((p) =>
      selectedSet.has(p.id) ? { ...p, rotation: (p.rotation + delta) % 360, thumbnailUrl: undefined } : p
    );

    set({
      pages: updatedPages,
      undoStack: [
        ...undoStack.slice(-14),
        { pages: [...pages], sourceFiles: [...sourceFiles], description: `Rotate ${selectedPageIds.length} pages` },
      ],
      redoStack: [],
    });

    get().addToast(`Rotated ${selectedPageIds.length} selected pages`, 'info');

    for (const pageId of selectedPageIds) {
      const page = updatedPages.find((p) => p.id === pageId);
      if (page) {
        const buffer = fileBufferMap.get(page.fileId);
        if (buffer) {
          renderPageThumbnail(buffer, page.pageIndex, page.rotation, page.crop).then((thumbnailUrl) => {
            set((state) => ({
              pages: state.pages.map((p) => (p.id === pageId ? { ...p, thumbnailUrl } : p)),
            }));
          });
        }
      }
    }
  },

  deletePage: (pageId: string) => {
    const { pages, sourceFiles, undoStack, selectedPageIds } = get();
    const target = pages.find((p) => p.id === pageId);
    set({
      pages: pages.filter((p) => p.id !== pageId),
      selectedPageIds: selectedPageIds.filter((id) => id !== pageId),
      undoStack: [
        ...undoStack.slice(-14),
        { pages: [...pages], sourceFiles: [...sourceFiles], description: `Delete page ${target?.displayPageNumber || ''}` },
      ],
      redoStack: [],
    });
    get().addToast('Page deleted (Ctrl+Z to undo)', 'info');
  },

  deleteSelectedPages: () => {
    const { pages, sourceFiles, undoStack, selectedPageIds } = get();
    if (selectedPageIds.length === 0) return;

    const selectedSet = new Set(selectedPageIds);
    set({
      pages: pages.filter((p) => !selectedSet.has(p.id)),
      selectedPageIds: [],
      undoStack: [
        ...undoStack.slice(-14),
        { pages: [...pages], sourceFiles: [...sourceFiles], description: `Delete ${selectedPageIds.length} pages` },
      ],
      redoStack: [],
    });
    get().addToast(`Deleted ${selectedPageIds.length} pages`, 'info');
  },

  splitPage: async (pageId: string, splitPositionRatio: number, direction: 'horizontal' | 'vertical' = 'horizontal') => {
    const { pages, sourceFiles, undoStack } = get();
    const index = pages.findIndex((p) => p.id === pageId);
    if (index === -1) return;

    const target = pages[index];
    const splitRatio = Math.max(0.1, Math.min(0.9, splitPositionRatio));

    let part1: PageItem;
    let part2: PageItem;

    if (direction === 'vertical') {
      part1 = {
        ...target,
        id: `${target.id}_left_${Date.now()}`,
        crop: { direction: 'vertical', left: 0, right: splitRatio },
        sectionLabel: `Left (${Math.round(splitRatio * 100)}%)`,
        thumbnailUrl: undefined,
      };
      part2 = {
        ...target,
        id: `${target.id}_right_${Date.now() + 1}`,
        crop: { direction: 'vertical', left: splitRatio, right: 1 },
        sectionLabel: `Right (${Math.round((1 - splitRatio) * 100)}%)`,
        thumbnailUrl: undefined,
      };
    } else {
      part1 = {
        ...target,
        id: `${target.id}_top_${Date.now()}`,
        crop: { direction: 'horizontal', top: 0, bottom: splitRatio },
        sectionLabel: `Top (${Math.round(splitRatio * 100)}%)`,
        thumbnailUrl: undefined,
      };
      part2 = {
        ...target,
        id: `${target.id}_bot_${Date.now() + 1}`,
        crop: { direction: 'horizontal', top: splitRatio, bottom: 1 },
        sectionLabel: `Bottom (${Math.round((1 - splitRatio) * 100)}%)`,
        thumbnailUrl: undefined,
      };
    }

    const newPages = [...pages];
    newPages.splice(index, 1, part1, part2);

    set({
      pages: newPages,
      activeSplitPageId: null,
      undoStack: [
        ...undoStack.slice(-14),
        { pages: [...pages], sourceFiles: [...sourceFiles], description: `Split page ${target.displayPageNumber}` },
      ],
      redoStack: [],
    });

    get().addToast(`Split page ${target.displayPageNumber} into two sections`, 'success');

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
      const diff = pages.length - filtered.length;
      set({
        pages: filtered,
        undoStack: [
          ...undoStack.slice(-14),
          { pages: [...pages], sourceFiles: [...sourceFiles], description: `Filter pages (${filterType})` },
        ],
        redoStack: [],
      });
      get().addToast(`Filtered: kept ${filtered.length} pages (${diff} removed)`, 'info');
    } else {
      get().addToast('No pages matched filter criteria', 'warning');
    }
  },

  togglePageSelection: (pageId: string, multiSelect = false) => {
    set((state) => {
      const isSelected = state.selectedPageIds.includes(pageId);
      if (!multiSelect) {
        return {
          selectedPageIds: isSelected ? [] : [pageId],
        };
      }
      return {
        selectedPageIds: isSelected
          ? state.selectedPageIds.filter((id) => id !== pageId)
          : [...state.selectedPageIds, pageId],
      };
    });
  },

  selectAllPages: () => {
    set((state) => ({
      selectedPageIds: state.pages.map((p) => p.id),
    }));
  },

  clearSelection: () => {
    set({ selectedPageIds: [] });
  },

  undo: () => {
    const { undoStack, redoStack, pages, sourceFiles } = get();
    if (undoStack.length === 0) return;
    const lastSnapshot = undoStack[undoStack.length - 1];

    set({
      pages: lastSnapshot.pages,
      sourceFiles: lastSnapshot.sourceFiles,
      undoStack: undoStack.slice(0, -1),
      redoStack: [
        ...redoStack.slice(-14),
        { pages: [...pages], sourceFiles: [...sourceFiles], description: lastSnapshot.description },
      ],
    });

    get().addToast(`Undo: ${lastSnapshot.description}`, 'info');
  },

  redo: () => {
    const { redoStack, undoStack, pages, sourceFiles } = get();
    if (redoStack.length === 0) return;
    const nextSnapshot = redoStack[redoStack.length - 1];

    set({
      pages: nextSnapshot.pages,
      sourceFiles: nextSnapshot.sourceFiles,
      redoStack: redoStack.slice(0, -1),
      undoStack: [
        ...undoStack.slice(-14),
        { pages: [...pages], sourceFiles: [...sourceFiles], description: nextSnapshot.description },
      ],
    });

    get().addToast(`Redo: ${nextSnapshot.description}`, 'info');
  },

  clearAll: () => {
    const { pages, sourceFiles, undoStack } = get();
    if (pages.length === 0 && sourceFiles.length === 0) return;

    fileBufferMap.clear();
    set({
      pages: [],
      sourceFiles: [],
      selectedPageIds: [],
      activePreviewPageId: null,
      activeSplitPageId: null,
      isProcessing: false,
      processingMessage: '',
      undoStack: [
        ...undoStack.slice(-14),
        { pages: [...pages], sourceFiles: [...sourceFiles], description: 'Clear all documents' },
      ],
      redoStack: [],
    });
    get().addToast('Cleared all documents and pages (Ctrl+Z to undo)', 'info');
  },

  setOutputName: (name: string) => set({ outputName: name }),
  updateSettings: (newSettings: Partial<AppSettings>) =>
    set((state) => ({ settings: { ...state.settings, ...newSettings } })),
  setActivePreviewPageId: (id: string | null) => set({ activePreviewPageId: id }),
  setActiveSplitPageId: (id: string | null) => set({ activeSplitPageId: id }),
  setDownloadDirectoryHandle: (handle: any | null) => set({ downloadDirectoryHandle: handle }),
}));
