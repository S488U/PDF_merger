export function formatFilename(pattern: string, fallback = 'merged-document.pdf'): string {
  if (!pattern) return fallback;
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;

  let result = pattern
    .replace('{date}', dateStr)
    .replace('{time}', timeStr)
    .replace('{timestamp}', Date.now().toString());

  if (!result.toLowerCase().endsWith('.pdf')) {
    result += '.pdf';
  }
  return result;
}

export async function savePdfFile(
  pdfBytes: Uint8Array,
  filename: string,
  directoryHandle?: any | null,
  promptSaveAs: boolean = false
): Promise<void> {
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });

  // 1. If File System Access API showSaveFilePicker is desired or available
  if (promptSaveAs && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'PDF Document',
            accept: { 'application/pdf': ['.pdf'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: any) {
      if (err.name === 'AbortError') return; // User cancelled
      console.warn('showSaveFilePicker failed, falling back:', err);
    }
  }

  // 2. If a target folder was previously selected with showDirectoryPicker
  if (directoryHandle && 'getFileHandle' in directoryHandle) {
    try {
      const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      console.warn('Failed saving to directoryHandle, falling back to standard download:', err);
    }
  }

  // 3. Fallback: Browser default anchor download
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
