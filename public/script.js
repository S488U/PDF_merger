// --- CONFIGURATION ---
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// --- STATE MANAGEMENT ---
let pages = [];
let fileMap = {};
let uploadedFiles = [];
let loadedPdfDocs = {};

// Staging
let pendingFiles = [];

// Caches
let pageCache = {};
let highResPageCache = {};

// Queue System
let renderingQueue = [];
let isRendering = false;
let sortableInstance = null;

// --- DOM ELEMENTS ---
const dropZone = document.getElementById("dropZone");
const pdfsInput = document.getElementById("pdfs");
const stagingArea = document.getElementById("stagingArea");
const stagingList = document.getElementById("stagingList");
const processBtn = document.getElementById("processBtn");
const pagesContainer = document.getElementById("pagesContainer");
const fileListContainer = document.getElementById("fileList");
const fileListUl = document.getElementById("fileListUl");
const mergeBtn = document.getElementById("mergeBtn");
const newNameInput = document.getElementById("newName");
const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const successToast = document.getElementById("successToast");
const startNewMergeBtn = document.getElementById("startNewMergeBtn");
const dismissSuccessToastBtn = document.getElementById("dismissSuccessToastBtn");
const noticeToast = document.getElementById("noticeToast");
const noticeToastTitle = document.getElementById("noticeToastTitle");
const noticeToastMessage = document.getElementById("noticeToastMessage");
const noticeToastIconWrap = document.getElementById("noticeToastIconWrap");
const noticeToastIcon = document.getElementById("noticeToastIcon");
const dismissNoticeToastBtn = document.getElementById("dismissNoticeToastBtn");
const dragStatusChip = document.getElementById("dragStatusChip");
const undoToast = document.getElementById("undoToast");
const undoToastMessage = document.getElementById("undoToastMessage");
const undoActionBtn = document.getElementById("undoActionBtn");
const dismissUndoToastBtn = document.getElementById("dismissUndoToastBtn");
const settingsToggle = document.getElementById("settingsToggle");
const settingsMenu = document.getElementById("settingsMenu");
const defaultNamePatternInput = document.getElementById("defaultNamePattern");
const autoResetAfterMergeInput = document.getElementById("autoResetAfterMerge");
const walkthroughCard = document.getElementById("walkthroughCard");
const dismissWalkthroughBtn = document.getElementById("dismissWalkthroughBtn");
const pageFilterPanel = document.getElementById("pageFilterPanel");
const filterFileSelect = document.getElementById("filterFileSelect");
const filterModeSelect = document.getElementById("filterModeSelect");
const filterRangeInput = document.getElementById("filterRangeInput");
const applyFilterBtn = document.getElementById("applyFilterBtn");
const isTouchDevice = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
let successToastTimer = null;
let noticeToastTimer = null;
let undoToastTimer = null;
let undoSnapshot = null;
let selectedPageId = null;

const SESSION_STORAGE_KEY = "pdf-tools-session-v1";
const SETTINGS_STORAGE_KEY = "pdf-tools-settings-v1";
const WALKTHROUGH_DISMISSED_KEY = "pdf-tools-walkthrough-dismissed-v1";
const settings = {
    defaultNamePattern: "merged-{date}",
    autoResetAfterMerge: false
};

// --- INTERSECTION OBSERVER ---
const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const div = entry.target;
            const pageId = div.dataset.id;

            if (pageCache[pageId]) {
                observer.unobserve(div);
                return;
            }

            // Prioritize this item in queue
            const queueIndex = renderingQueue.findIndex(item => item.id === pageId);
            if (queueIndex > -1) {
                const [item] = renderingQueue.splice(queueIndex, 1);
                renderingQueue.unshift(item);
                processQueue();
            }
            observer.unobserve(div);
        }
    });
}, { rootMargin: "200px" });

function getDateStamp() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}${mm}${dd}`;
}

function getEffectiveOutputName() {
    const raw = (newNameInput.value || "").trim();
    if (raw) return raw;
    return (settings.defaultNamePattern || "merged-{date}")
        .replaceAll("{date}", getDateStamp())
        .replaceAll("{time}", String(Date.now()));
}

function saveSession() {
    const state = {
        pages,
        fileMap,
        uploadedFiles,
        newName: newNameInput.value || "",
        selectedPageId
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
}

function loadSession() {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return;
    try {
        const state = JSON.parse(raw);
        pages = Array.isArray(state.pages) ? state.pages : [];
        fileMap = state.fileMap || {};
        uploadedFiles = Array.isArray(state.uploadedFiles) ? state.uploadedFiles : [];
        selectedPageId = state.selectedPageId || null;
        newNameInput.value = state.newName || "";
        showFileList();
        renderPages();
    } catch (err) {
        console.error("Failed to load session:", err);
        localStorage.removeItem(SESSION_STORAGE_KEY);
    }
}

function saveSettings() {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function loadSettings() {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed.defaultNamePattern === "string") settings.defaultNamePattern = parsed.defaultNamePattern;
            if (typeof parsed.autoResetAfterMerge === "boolean") settings.autoResetAfterMerge = parsed.autoResetAfterMerge;
        } catch (err) {
            console.error("Failed to load settings:", err);
        }
    }
    defaultNamePatternInput.value = settings.defaultNamePattern;
    autoResetAfterMergeInput.checked = settings.autoResetAfterMerge;
}

function captureSnapshot() {
    return {
        pages: pages.map(p => ({ ...p })),
        fileMap: { ...fileMap },
        uploadedFiles: uploadedFiles.map(f => ({ ...f })),
        selectedPageId
    };
}

function restoreSnapshot(snapshot) {
    pages = snapshot.pages.map(p => ({ ...p }));
    fileMap = { ...snapshot.fileMap };
    uploadedFiles = snapshot.uploadedFiles.map(f => ({ ...f }));
    selectedPageId = snapshot.selectedPageId || null;
    showFileList();
    renderPages();
    updateMergeButtonState();
    saveSession();
}

function clearUndoToast() {
    undoToast.classList.add("hidden");
    undoSnapshot = null;
    if (undoToastTimer) {
        clearTimeout(undoToastTimer);
        undoToastTimer = null;
    }
}

function showUndoToast(message, snapshot) {
    undoSnapshot = snapshot;
    undoToastMessage.textContent = message;
    undoToast.classList.remove("hidden");
    if (undoToastTimer) clearTimeout(undoToastTimer);
    undoToastTimer = setTimeout(() => {
        clearUndoToast();
    }, 5000);
}

function getFileBadgeData(filename) {
    const base = filename.replace(/\.pdf$/i, "").trim();
    const initials = (base.split(/[\s._-]+/).map(part => part[0]).join("").slice(0, 2) || "PDF").toUpperCase();
    let hash = 0;
    for (const ch of base) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    const hue = hash % 360;
    return {
        initials,
        bg: `hsl(${hue} 70% 92%)`,
        fg: `hsl(${hue} 55% 30%)`
    };
}

function parsePageRange(rangeText, maxPage) {
    const tokens = rangeText.split(",").map(t => t.trim()).filter(Boolean);
    const included = new Set();
    for (const token of tokens) {
        if (token.includes("-")) {
            const [startStr, endStr] = token.split("-").map(v => v.trim());
            const start = Number(startStr);
            const end = Number(endStr);
            if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1) return null;
            const lo = Math.min(start, end);
            const hi = Math.max(start, end);
            for (let i = lo; i <= hi; i++) {
                if (i <= maxPage) included.add(i);
            }
        } else {
            const pageNum = Number(token);
            if (!Number.isInteger(pageNum) || pageNum < 1) return null;
            if (pageNum <= maxPage) included.add(pageNum);
        }
    }
    return included;
}

function selectPage(id) {
    selectedPageId = id;
    document.querySelectorAll("[data-id]").forEach((card) => {
        if (card.dataset.id === id) {
            card.style.outline = "2px solid color-mix(in srgb, var(--text) 30%, transparent)";
            card.style.outlineOffset = "0";
            card.setAttribute("aria-selected", "true");
        } else {
            card.style.outline = "none";
            card.setAttribute("aria-selected", "false");
        }
    });
    saveSession();
}

function refreshWalkthroughVisibility() {
    const dismissed = localStorage.getItem(WALKTHROUGH_DISMISSED_KEY) === "1";
    const hasStarted = pages.length > 0 || uploadedFiles.length > 0;
    walkthroughCard.classList.toggle("hidden", dismissed || hasStarted);
}

function rotatePageById(id) {
    const pageToRotate = pages.find(page => page.id === id);
    if (!pageToRotate) return;
    pageToRotate.rotation = (pageToRotate.rotation + 90) % 360;
    const card = document.querySelector(`div[data-id="${id}"]`);
    const img = card?.querySelector("img");
    if (img) updateImageTransform(img, pageToRotate.rotation);
    saveSession();
}

// --- FILE SELECTION & DRAG DROP LOGIC ---

// 1. Handle File Selection (Input Change)
pdfsInput.addEventListener("change", (e) => {
    handleFiles(Array.from(e.target.files));
});

// 2. Handle Drag & Drop on DropZone
dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--text)";
    dropZone.style.background = "color-mix(in srgb, var(--surface-muted) 70%, var(--text) 8%)";
});

dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--border)";
    dropZone.style.background = "var(--surface-muted)";
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--border)";
    dropZone.style.background = "var(--surface-muted)";
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(Array.from(e.dataTransfer.files));
    }
});

function handleFiles(files) {
    const newFiles = files.filter(f => f.type === "application/pdf");
    if (newFiles.length === 0) {
        showNoticeToast("Invalid file type", "Please select PDF files only.", "warning");
        return;
    }

    // Add to pending queue
    pendingFiles = [...pendingFiles, ...newFiles];
    renderStagingList();
}

function renderStagingList() {
    stagingList.innerHTML = "";
    if (pendingFiles.length === 0) {
        stagingArea.classList.add("hidden");
        return;
    }

    stagingArea.classList.remove("hidden");

    pendingFiles.forEach((file, idx) => {
        const li = document.createElement("li");
        li.className = "flex justify-between items-center px-3 py-2 rounded border";
        li.style.background = "var(--surface-muted)";
        li.style.borderColor = "var(--border)";
        li.innerHTML = `
            <span class="truncate">${file.name}</span>
            <button class="ml-2 font-bold w-8 h-8 inline-flex items-center justify-center rounded-full border transition">✕</button>
        `;
        const removePendingBtn = li.querySelector("button");
        removePendingBtn.style.color = "#dc2626";
        removePendingBtn.style.borderColor = "var(--border)";
        removePendingBtn.style.background = "var(--surface)";
        removePendingBtn.onclick = () => {
            pendingFiles.splice(idx, 1);
            renderStagingList();
        };
        stagingList.appendChild(li);
    });
}

// 3. Process Button Click (Upload)
processBtn.addEventListener("click", () => {
    if (pendingFiles.length === 0) return;

    const formData = new FormData();
    pendingFiles.forEach(f => formData.append("pdfs", f));

    uploadFiles(formData);
});

function uploadFiles(formData) {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/upload", true);

    xhr.onload = function () {
        setLoadingState(processBtn, false, "Process Selected Files");
        progressContainer.classList.add("hidden");

        // Clear staging
        pendingFiles = [];
        renderStagingList();

        if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            pages = pages.concat(data.pages);
            fileMap = { ...fileMap, ...data.fileMap };
            uploadedFiles = uploadedFiles.concat(data.fileNames);

            showFileList();
            renderPages();
            saveSession();
        } else {
            console.error("Upload failed:", xhr.responseText);
            showNoticeToast("Upload failed", "Unable to upload files. Please try again.", "error");
        }
    };

    xhr.onerror = () => {
        setLoadingState(processBtn, false, "Process Selected Files");
        progressContainer.classList.add("hidden");
        showNoticeToast("Network error", "Please check your connection and retry.", "error");
    };

    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            progressBar.style.width = percent + '%';
            progressText.innerText = percent + '%';
        }
    };

    setLoadingState(processBtn, true, "Uploading & Processing...");
    progressContainer.classList.remove("hidden");
    progressBar.style.width = '0%';
    stagingArea.classList.add("hidden"); // Hide list while uploading
    xhr.send(formData);
}


// --- QUEUE ENGINE ---
async function processQueue() {
    if (isRendering || renderingQueue.length === 0) return;

    isRendering = true;
    const task = renderingQueue.shift();

    // Only render if page still exists in the array
    const pageStillExists = pages.some(p => p.id === task.id);
    if (pageStillExists && !pageCache[task.id]) {
        await generateThumbnail(task.id, task.file, task.index);
    }

    isRendering = false;
    if (renderingQueue.length > 0) {
        requestAnimationFrame(processQueue);
    }
}

// --- CORE FUNCTIONS ---

function renderPages() {
    pagesContainer.innerHTML = "";
    refreshWalkthroughVisibility();

    if (pages.length === 0) {
        pagesContainer.innerHTML = `
            <div class="col-span-full py-12 flex flex-col items-center justify-center border border-dashed rounded-xl" style="color:var(--text-muted); border-color:var(--border); background:var(--surface-muted);">
                <svg class="w-7 h-7 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 5h8M8 9h8M8 13h5M6 3h12a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <p class="text-sm">Pages will appear here</p>
            </div>`;
        updateMergeButtonState();
        return;
    }

    pages.forEach((p, idx) => {
        const div = document.createElement("div");
        div.className = "prevent-select fade-in p-1.5 rounded-xl border relative flex flex-col items-center justify-center aspect-[3/4] w-full overflow-hidden select-none group transition-all";
        div.style.background = "var(--surface)";
        div.style.borderColor = "var(--border)";
        div.style.boxShadow = "0 10px 20px -16px rgba(15,23,42,0.5)";

        div.dataset.id = p.id;
        div.tabIndex = 0;
        div.setAttribute("role", "button");
        div.setAttribute("aria-label", `Page ${idx + 1} from ${p.originalFile}`);
        div.setAttribute("aria-selected", selectedPageId === p.id ? "true" : "false");
        div.onclick = () => selectPage(p.id);
        div.onfocus = () => selectPage(p.id);

        // Disable context menu so long-press doesn't open browser menu
        div.oncontextmenu = (e) => { e.preventDefault(); return false; };

        // Badge
        const num = document.createElement("span");
        num.className = "absolute top-2 left-2 text-[10px] w-5 h-5 flex items-center justify-center rounded-full shadow z-10 font-bold pointer-events-none";
        num.style.background = "var(--badge-bg)";
        num.style.color = "var(--badge-fg)";
        num.textContent = idx + 1;
        div.appendChild(num);

        // Drag handle to avoid conflict with scrolling and tapping on touch devices
        const dragHandle = document.createElement("button");
        dragHandle.type = "button";
        dragHandle.setAttribute("aria-label", "Drag page");
        dragHandle.className = "drag-handle absolute top-2 right-10 border rounded-full w-8 h-8 md:w-7 md:h-7 flex items-center justify-center z-20 touch-none opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity";
        dragHandle.style.background = "color-mix(in srgb, var(--surface) 90%, transparent)";
        dragHandle.style.borderColor = "var(--border)";
        dragHandle.style.color = "var(--icon-fg)";
        dragHandle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>`;
        div.appendChild(dragHandle);

        if (pageCache[p.id]) {
            appendImageToCard(div, pageCache[p.id], p);
        } else {
            const skeleton = document.createElement("div");
            skeleton.id = `skeleton-${p.id}`;
            skeleton.className = "w-full h-full animate-pulse rounded flex items-center justify-center text-center p-2";
            skeleton.style.background = "var(--surface-muted)";
            skeleton.innerHTML = `<div class="text-[10px] subtle-text">Rendering...</div>`;
            div.appendChild(skeleton);

            renderingQueue.push({ id: p.id, file: p.file, index: p.pageIndex });
            imageObserver.observe(div);
        }

        // --- RESTORED LABEL (Filename - Pg X) ---
        const label = document.createElement("div");
        label.className = "absolute bottom-0 left-0 right-0 backdrop-blur-sm p-1 text-[9px] text-center truncate border-t pointer-events-none";
        label.style.background = "color-mix(in srgb, var(--surface) 94%, transparent)";
        label.style.borderColor = "var(--border)";
        label.style.color = "var(--text-muted)";
        label.textContent = `${p.originalFile} • Pg ${p.originalPage}`;
        div.appendChild(label);

        // Buttons
        const buttonGroup = document.createElement("div");
        buttonGroup.className = "absolute bottom-6 right-2 flex gap-1 z-20 backdrop-blur border rounded-md p-0.5 shadow-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity";
        buttonGroup.style.background = "color-mix(in srgb, var(--surface) 94%, transparent)";
        buttonGroup.style.borderColor = "var(--border)";

        const zoomBtn = createIconBtn("hover:bg-black/5 dark:hover:bg-white/10", () => openModal(p));
        zoomBtn.style.color = "var(--icon-fg)";
        zoomBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>`;
        buttonGroup.appendChild(zoomBtn);

        const rotateBtn = createIconBtn("hover:bg-black/5 dark:hover:bg-white/10", () => {
            rotatePageById(p.id);
        });
        rotateBtn.style.color = "var(--icon-fg)";
        rotateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-4.991-2.695v4.992h-4.992" /></svg>`;
        buttonGroup.appendChild(rotateBtn);
        div.appendChild(buttonGroup);

        const delBtn = document.createElement("button");
        delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3 h-3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;
        delBtn.className = "absolute top-2 right-2 border rounded-full w-8 h-8 md:w-7 md:h-7 flex items-center justify-center transition shadow-sm z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100";
        delBtn.style.background = "color-mix(in srgb, var(--surface) 94%, transparent)";
        delBtn.style.borderColor = "var(--border)";
        delBtn.style.color = "#dc2626";
        delBtn.onclick = (e) => { e.stopPropagation(); deletePage(p.id, true); };
        div.appendChild(delBtn);

        pagesContainer.appendChild(div);
    });

    processQueue();

    if (sortableInstance) {
        sortableInstance.destroy();
    }

    // Touch devices get fallback drag for more consistent behavior across mobile browsers.
    sortableInstance = Sortable.create(pagesContainer, {
        animation: 200,
        handle: undefined,
        delay: isTouchDevice ? 180 : 0,
        delayOnTouchOnly: true,
        touchStartThreshold: 4,
        forceFallback: isTouchDevice,
        fallbackOnBody: true,
        ghostClass: "sortable-ghost",
        chosenClass: "card-dragging",
        scroll: true,
        scrollSensitivity: 120,
        scrollSpeed: 18,
        onStart: () => {
            dragStatusChip.classList.remove("hidden");
        },
        onEnd: () => {
            const newOrder = [];
            Array.from(pagesContainer.children).forEach(el => {
                const id = el.dataset.id;
                newOrder.push(pages.find(p => p.id === id));
            });
            pages = newOrder;
            refreshPageNumbers();
            dragStatusChip.classList.add("hidden");
            saveSession();
        },
    });

    updateMergeButtonState();
    if (selectedPageId && pages.some(p => p.id === selectedPageId)) {
        selectPage(selectedPageId);
    }
}

async function generateThumbnail(pageId, filename, pageIndex) {
    try {
        let pdfDoc = loadedPdfDocs[filename];
        if (!pdfDoc) {
            if (!fileMap[filename]) return;
            const pdfBytes = await fetch(`/uploads/${filename}`).then(r => r.arrayBuffer());
            pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
            loadedPdfDocs[filename] = pdfDoc;
        }

        const pdfPage = await pdfDoc.getPage(pageIndex + 1);
        const viewport = pdfPage.getViewport({ scale: 0.4 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await pdfPage.render({ canvasContext: context, viewport }).promise;

        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            pageCache[pageId] = url;

            const currentEl = document.querySelector(`div[data-id="${pageId}"]`);
            if (currentEl) {
                const pageData = pages.find(p => p.id === pageId);
                if (pageData) appendImageToCard(currentEl, url, pageData);
            }
        }, "image/jpeg", 0.7);

    } catch (error) {
        console.error(`Error rendering page ${pageId}:`, error);
    }
}

function appendImageToCard(container, src, pageData) {
    const skeleton = container.querySelector(`[id^="skeleton-"]`);
    if (skeleton) skeleton.remove();

    if (container.querySelector("img")) return;

    const img = document.createElement("img");
    img.src = src;
    img.className = "pointer-events-none rounded max-w-full max-h-full object-contain transition-all duration-500 opacity-0 pb-4";

    updateImageTransform(img, pageData.rotation);
    container.insertBefore(img, container.querySelector('.absolute.bottom-0'));
    requestAnimationFrame(() => img.classList.remove("opacity-0"));
}

function deletePage(id, offerUndo = false) {
    const snapshot = offerUndo ? captureSnapshot() : null;
    pages = pages.filter(page => page.id !== id);
    renderingQueue = renderingQueue.filter(item => item.id !== id);
    const card = document.querySelector(`div[data-id="${id}"]`);
    if (card) card.remove();
    releasePageMemory(id);
    refreshPageNumbers();
    updateMergeButtonState();
    if (selectedPageId === id) selectedPageId = null;
    if (offerUndo) showUndoToast("Page removed", snapshot);
    saveSession();
}

function releasePageMemory(id) {
    if (pageCache[id]) { URL.revokeObjectURL(pageCache[id]); delete pageCache[id]; }
    if (highResPageCache[id]) { URL.revokeObjectURL(highResPageCache[id]); delete highResPageCache[id]; }
}

function resetApplication() {
    pages = [];
    fileMap = {};
    uploadedFiles = [];
    pendingFiles = [];
    renderingQueue = [];
    isRendering = false;

    Object.keys(pageCache).forEach((id) => URL.revokeObjectURL(pageCache[id]));
    pageCache = {};
    Object.keys(highResPageCache).forEach((id) => URL.revokeObjectURL(highResPageCache[id]));
    highResPageCache = {};

    Object.keys(loadedPdfDocs).forEach((filename) => {
        if (loadedPdfDocs[filename]) loadedPdfDocs[filename].destroy();
    });
    loadedPdfDocs = {};

    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }

    if (successToastTimer) {
        clearTimeout(successToastTimer);
        successToastTimer = null;
    }

    renderStagingList();
    showFileList();
    renderPages();
    updateMergeButtonState();

    progressContainer.classList.add("hidden");
    progressBar.style.width = "0%";
    progressText.innerText = "0%";
    pdfsInput.value = "";
    newNameInput.value = "";
    setLoadingState(mergeBtn, false, "Download Merged PDF");
    successToast.classList.add("hidden");
    dragStatusChip.classList.add("hidden");
    clearUndoToast();
    localStorage.removeItem(SESSION_STORAGE_KEY);
}

function showSuccessToast(summary) {
    const summaryText = summary || "Download started. Start a new merge?";
    const summaryEl = successToast.querySelector(".subtle-text");
    if (summaryEl) summaryEl.textContent = summaryText;
    successToast.classList.remove("hidden");
    if (successToastTimer) clearTimeout(successToastTimer);
    successToastTimer = setTimeout(() => {
        successToast.classList.add("hidden");
        successToastTimer = null;
    }, 7000);
}

function showNoticeToast(title, message, tone = "error") {
    const tones = {
        error: { fg: "#dc2626", bg: "color-mix(in srgb, #ef4444 18%, transparent)" },
        warning: { fg: "#d97706", bg: "color-mix(in srgb, #f59e0b 20%, transparent)" },
        info: { fg: "#2563eb", bg: "color-mix(in srgb, #3b82f6 18%, transparent)" }
    };
    const selected = tones[tone] || tones.error;

    noticeToastTitle.textContent = title;
    noticeToastMessage.textContent = message;
    noticeToastIcon.style.color = selected.fg;
    noticeToastIconWrap.style.background = selected.bg;
    noticeToast.classList.remove("hidden");

    if (noticeToastTimer) clearTimeout(noticeToastTimer);
    noticeToastTimer = setTimeout(() => {
        noticeToast.classList.add("hidden");
        noticeToastTimer = null;
    }, 5000);
}

function applyFilePageFilter() {
    const filename = filterFileSelect.value;
    const mode = filterModeSelect.value;
    if (!filename) return;

    const snapshot = captureSnapshot();
    const targetPages = pages.filter(p => p.file === filename);
    if (targetPages.length === 0) return;

    let keepSet = new Set(targetPages.map(p => p.id));
    if (mode === "odd") {
        keepSet = new Set(targetPages.filter(p => p.originalPage % 2 === 1).map(p => p.id));
    } else if (mode === "even") {
        keepSet = new Set(targetPages.filter(p => p.originalPage % 2 === 0).map(p => p.id));
    } else if (mode === "range") {
        const maxOriginalPage = Math.max(...targetPages.map(p => p.originalPage));
        const parsed = parsePageRange(filterRangeInput.value, maxOriginalPage);
        if (!parsed || parsed.size === 0) {
            showNoticeToast("Invalid range", "Use format like 1-3,7", "warning");
            return;
        }
        keepSet = new Set(targetPages.filter(p => parsed.has(p.originalPage)).map(p => p.id));
    }

    const removed = pages.filter(p => p.file === filename && !keepSet.has(p.id));
    if (removed.length === 0) return;
    removed.forEach((p) => releasePageMemory(p.id));
    pages = pages.filter(p => !(p.file === filename && !keepSet.has(p.id)));
    renderPages();
    showUndoToast(`Filtered ${removed.length} page${removed.length === 1 ? "" : "s"}`, snapshot);
    saveSession();
}

function updateRangeInputVisibility() {
    const isRange = filterModeSelect.value === "range";
    filterRangeInput.disabled = !isRange;
    filterRangeInput.classList.toggle("hidden", !isRange);
}

function showFileList() {
    fileListUl.innerHTML = "";
    uploadedFiles.forEach((fileInfo, idx) => {
        const li = document.createElement("li");
        const badge = getFileBadgeData(fileInfo.original);
        li.className = "flex items-center justify-between px-4 py-3 text-sm";
        li.innerHTML = `<div class="flex items-center gap-3 overflow-hidden">
            <span class="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" style="background:${badge.bg}; color:${badge.fg};">${badge.initials}</span>
            <span class="truncate" title="${fileInfo.original}">${idx + 1}. ${fileInfo.original}</span>
        </div>`;

        const delBtn = document.createElement("button");
        delBtn.innerHTML = `✕`;
        delBtn.className = "transition w-8 h-8 inline-flex items-center justify-center rounded-full border";
        delBtn.style.color = "#dc2626";
        delBtn.style.background = "var(--surface)";
        delBtn.style.borderColor = "var(--border)";

        delBtn.onclick = () => {
            const snapshot = captureSnapshot();
            const pagesToRemove = pages.filter(p => p.file === fileInfo.filename);
            pagesToRemove.forEach(p => deletePage(p.id));

            if (loadedPdfDocs[fileInfo.filename]) {
                loadedPdfDocs[fileInfo.filename].destroy();
                delete loadedPdfDocs[fileInfo.filename];
            }

            uploadedFiles = uploadedFiles.filter(uf => uf.filename !== fileInfo.filename);
            delete fileMap[fileInfo.filename];
            showFileList();
            renderPages();
            showUndoToast(`Removed ${fileInfo.original}`, snapshot);
            saveSession();
        };
        li.appendChild(delBtn);
        fileListUl.appendChild(li);
    });
    fileListContainer.classList.toggle("hidden", uploadedFiles.length === 0);
    pageFilterPanel.classList.toggle("hidden", uploadedFiles.length === 0);
    filterFileSelect.innerHTML = uploadedFiles.map(fileInfo => `<option value="${fileInfo.filename}">${fileInfo.original}</option>`).join("");
}

function refreshPageNumbers() {
    const cards = pagesContainer.children;
    Array.from(cards).forEach((card, index) => {
        const badge = card.querySelector('span.absolute.top-2');
        if (badge) badge.textContent = index + 1;
    });
}

function updateImageTransform(img, rotation) {
    let transform = `rotate(${rotation || 0}deg)`;
    if (rotation === 90 || rotation === 270) transform += ` scale(0.75)`;
    img.style.transform = transform;
}

function setLoadingState(button, isLoading, loadingText) {
    button.disabled = isLoading;
    if (isLoading) {
        button.dataset.originalText = button.textContent;
        button.innerHTML = `<span class="animate-pulse">${loadingText}</span>`;
    } else {
        button.innerHTML = button.dataset.originalText || button.textContent;
    }
}

function createIconBtn(classes, onClick) {
    const btn = document.createElement("button");
    btn.className = `${classes} rounded-full w-10 h-10 md:w-8 md:h-8 flex items-center justify-center transition active:scale-90 border`;
    btn.style.borderColor = "var(--border)";
    btn.onclick = (e) => { e.stopPropagation(); onClick(e); };
    return btn;
}

function updateMergeButtonState() {
    const hasPages = pages.length > 0;
    mergeBtn.disabled = !hasPages;
    newNameInput.disabled = !hasPages;
}

// --- MERGE LOGIC ---
mergeBtn.addEventListener("click", async () => {
    if (!pages.length) {
        showNoticeToast("Nothing to merge", "No pages to merge!", "warning");
        return;
    }
    const newName = getEffectiveOutputName();
    setLoadingState(mergeBtn, true, "Merging...");

    try {
        const res = await fetch("/merge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: pages, fileMap, newName }),
        });

        if (res.ok) {
            const mergedPagesCount = pages.length;
            const sourceFilesCount = uploadedFiles.length;
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${newName}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            setLoadingState(mergeBtn, false, "Done!");
            showSuccessToast(`Downloaded ${newName}.pdf • ${mergedPagesCount} pages from ${sourceFilesCount} file${sourceFilesCount === 1 ? "" : "s"}.`);
            localStorage.removeItem(SESSION_STORAGE_KEY);
            if (settings.autoResetAfterMerge) {
                setTimeout(() => resetApplication(), 1000);
            }
        } else {
            const errData = await res.json();
            throw new Error(errData.error || "Merge failed");
        }
    } catch (error) {
        console.error("Merge Error:", error);
        showNoticeToast("Merge failed", error.message || "Something went wrong while merging.", "error");
        setLoadingState(mergeBtn, false, "Download Merged PDF");
    }
});

startNewMergeBtn.addEventListener("click", resetApplication);
dismissSuccessToastBtn.addEventListener("click", () => {
    successToast.classList.add("hidden");
    if (successToastTimer) {
        clearTimeout(successToastTimer);
        successToastTimer = null;
    }
});
dismissNoticeToastBtn.addEventListener("click", () => {
    noticeToast.classList.add("hidden");
    if (noticeToastTimer) {
        clearTimeout(noticeToastTimer);
        noticeToastTimer = null;
    }
});
undoActionBtn.addEventListener("click", () => {
    if (!undoSnapshot) return;
    restoreSnapshot(undoSnapshot);
    clearUndoToast();
});
dismissUndoToastBtn.addEventListener("click", clearUndoToast);

settingsToggle.addEventListener("click", () => {
    settingsMenu.classList.toggle("hidden");
});
document.addEventListener("click", (e) => {
    if (settingsMenu.classList.contains("hidden")) return;
    if (settingsMenu.contains(e.target) || settingsToggle.contains(e.target)) return;
    settingsMenu.classList.add("hidden");
});
defaultNamePatternInput.addEventListener("change", () => {
    settings.defaultNamePattern = defaultNamePatternInput.value.trim() || "merged-{date}";
    defaultNamePatternInput.value = settings.defaultNamePattern;
    saveSettings();
});
autoResetAfterMergeInput.addEventListener("change", () => {
    settings.autoResetAfterMerge = autoResetAfterMergeInput.checked;
    saveSettings();
});

dismissWalkthroughBtn.addEventListener("click", () => {
    walkthroughCard.classList.add("hidden");
    localStorage.setItem(WALKTHROUGH_DISMISSED_KEY, "1");
});

filterModeSelect.addEventListener("change", () => {
    updateRangeInputVisibility();
});
applyFilterBtn.addEventListener("click", applyFilePageFilter);

newNameInput.addEventListener("input", saveSession);

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        if (!settingsMenu.classList.contains("hidden")) settingsMenu.classList.add("hidden");
        if (!successToast.classList.contains("hidden")) successToast.classList.add("hidden");
        if (!noticeToast.classList.contains("hidden")) noticeToast.classList.add("hidden");
        if (!undoToast.classList.contains("hidden")) clearUndoToast();
        if (!modalOverlay.classList.contains("hidden")) {
            modalOverlay.classList.add("hidden");
            modalImage.src = "";
        }
        return;
    }

    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (!pages.length) return;

    const currentIndex = pages.findIndex(p => p.id === selectedPageId);
    if (e.key === "Delete" || e.key === "Backspace") {
        if (!selectedPageId) return;
        e.preventDefault();
        deletePage(selectedPageId, true);
        return;
    }
    if (e.key.toLowerCase() === "r") {
        if (!selectedPageId) return;
        e.preventDefault();
        rotatePageById(selectedPageId);
        return;
    }
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, pages.length - 1);
        selectPage(pages[next].id);
        return;
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = currentIndex < 0 ? 0 : Math.max(currentIndex - 1, 0);
        selectPage(pages[prev].id);
    }
});


// --- MODAL LOGIC ---
const modalOverlay = document.getElementById("modalOverlay");
const modalImage = document.getElementById("modalImage");
const modalClose = document.getElementById("modalClose");
const modalLoader = document.getElementById("modalLoader");

async function openModal(page) {
    modalOverlay.classList.remove("hidden");
    modalImage.classList.add("hidden");
    modalLoader.classList.remove("hidden");

    // Check Cache first
    if (highResPageCache[page.id]) {
        modalImage.src = highResPageCache[page.id];
    } else {
        const highResSrc = await getHighResPageDataUrl(page);
        modalImage.src = highResSrc;
    }

    modalImage.style.transform = `rotate(${page.rotation || 0}deg)`;

    // When image loads, show it
    modalImage.onload = () => {
        modalLoader.classList.add("hidden");
        modalImage.classList.remove("hidden");
    };
}

document.getElementById("modalClose").addEventListener("click", () => {
    modalOverlay.classList.add("hidden");
    modalImage.src = "";
});

// Helper for High Res
async function getHighResPageDataUrl(page) {
    try {
        let pdfDoc = loadedPdfDocs[page.file];
        if (!pdfDoc) {
            const pdfBytes = await fetch(`/uploads/${page.file}`).then(r => r.arrayBuffer());
            pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
            loadedPdfDocs[page.file] = pdfDoc;
        }

        const pdfPage = await pdfDoc.getPage(page.pageIndex + 1);
        const viewport = pdfPage.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await pdfPage.render({ canvasContext: context, viewport }).promise;

        return await new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                highResPageCache[page.id] = url;
                resolve(url);
            }, "image/jpeg", 0.9);
        });
    } catch (error) {
        console.error("High Res Error:", error);
        return "";
    }
}

// --- DARK MODE LOGIC ---
const themeToggle = document.getElementById('themeToggle');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');
const html = document.documentElement;

// Check Local Storage
if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    html.classList.add('dark');
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
} else {
    html.classList.remove('dark');
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
}

themeToggle.addEventListener('click', () => {
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.theme = 'light';
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    } else {
        html.classList.add('dark');
        localStorage.theme = 'dark';
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    }
});

loadSettings();
updateRangeInputVisibility();
loadSession();
if (!pages.length) renderPages();
refreshWalkthroughVisibility();
