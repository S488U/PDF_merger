export interface CropBox {
  direction?: 'horizontal' | 'vertical';
  top?: number; // 0 to 1
  bottom?: number; // 0 to 1
  left?: number; // 0 to 1
  right?: number; // 0 to 1
}

export interface PageItem {
  id: string;
  fileId: string;
  fileName: string;
  pageIndex: number; // 0-indexed in source file
  displayPageNumber: number; // 1-indexed in source file
  rotation: number; // 0, 90, 180, 270
  crop?: CropBox;
  thumbnailUrl?: string;
  sectionLabel?: string; // e.g. "Top", "Bottom", "Part 1"
}

export interface SourceFile {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  colorCode: string;
  arrayBuffer?: ArrayBuffer;
  blobUrl?: string;
}

export interface MergePageRequest {
  fileId: string;
  fileName: string;
  pageIndex: number;
  rotation: number;
  crop?: CropBox;
}

export type GridDensity = 'compact' | 'comfortable' | 'spacious';

export interface AppSettings {
  pattern: string;
  autoResetAfterMerge: boolean;
  individualPageSaveAs: boolean;
  theme: 'light' | 'dark' | 'system';
  gridDensity: GridDensity;
}

export interface UndoSnapshot {
  pages: PageItem[];
  sourceFiles: SourceFile[];
  description: string;
}

export interface ToastNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}
