// --- CONFIGURATION ---
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// --- STATE MANAGEMENT ---
let pages = [];              
let fileMap = {};            
let uploadedFiles = [];      
let loadedPdfDocs = {};      

// Caches (Blob URLs)
let pageCache = {};          
let highResPageCache = {};   

// Queue System
let renderingQueue = [];     
let isRendering = false;     

// --- DOM ELEMENTS ---
const uploadForm = document.getElementById("uploadForm");
const pdfsInput = document.getElementById("pdfs");
const uploadBtn = uploadForm.querySelector("button[type='submit']");
const pagesContainer = document.getElementById("pagesContainer");
const fileListContainer = document.getElementById("fileList");
const fileListUl = document.getElementById("fileListUl");
const mergeBtn = document.getElementById("mergeBtn");
const newNameInput = document.getElementById("newName");
const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");
const modalOverlay = document.getElementById("modalOverlay");
const modalImage = document.getElementById("modalImage");
const modalClose = document.getElementById("modalClose");
const modalLoader = document.getElementById("modalLoader");

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


// --- QUEUE ENGINE ---
async function processQueue() {
    if (isRendering || renderingQueue.length === 0) return;
    
    isRendering = true;
    const task = renderingQueue.shift();
    
    const pageStillExists = pages.some(p => p.id === task.id);
    if (pageStillExists && !pageCache[task.id]) {
        await generateThumbnail(task.id, task.file, task.index);
    }
    
    isRendering = false;
    if (renderingQueue.length > 0) {
        requestAnimationFrame(processQueue);
    }
}


// --- EVENT LISTENERS ---

uploadForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const files = pdfsInput.files;
    if (!files.length) return;

    const formData = new FormData();
    for (const f of files) formData.append("pdfs", f);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/upload", true);

    xhr.onload = async function() {
        setLoadingState(uploadBtn, false, "Upload");
        progressContainer.classList.add("hidden");
        uploadForm.reset();

        if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            pages = pages.concat(data.pages);
            fileMap = { ...fileMap, ...data.fileMap };
            uploadedFiles = uploadedFiles.concat(data.fileNames);
            
            showFileList();
            renderPages(); 
        } else {
            console.error("Upload failed:", xhr.responseText);
            alert("An error occurred during upload.");
        }
    };

    xhr.onerror = () => {
        setLoadingState(uploadBtn, false, "Upload");
        progressContainer.classList.add("hidden");
        alert("Network error.");
    };

    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percent = (event.loaded / event.total) * 100;
            progressBar.style.width = percent + '%';
        }
    };

    setLoadingState(uploadBtn, true, "Uploading...");
    progressContainer.classList.remove("hidden");
    progressBar.style.width = '0%';
    xhr.send(formData);
});

mergeBtn.addEventListener("click", async () => {
    if (!pages.length) return alert("No pages to merge!");
    const newName = newNameInput.value || "merged";
    setLoadingState(mergeBtn, true, "Merging...");
    
    try {
        const res = await fetch("/merge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: pages, fileMap, newName }),
        });

        if (res.ok) {
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
            setTimeout(() => {
                alert("Merge Successful! The application will now reset.");
                resetApplication();
            }, 1000);
        } else {
            const errData = await res.json();
            throw new Error(errData.error || "Merge failed");
        }
    } catch (error) {
        console.error("Merge Error:", error);
        alert(`Error: ${error.message}`);
        setLoadingState(mergeBtn, false, "Merge PDFs");
    }
});

modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) closeModal(); });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });


// --- CORE FUNCTIONS ---

function renderPages() {
    pagesContainer.innerHTML = ""; 

    if (pages.length === 0) {
        pagesContainer.innerHTML = `<p class="text-gray-500 col-span-full text-center py-10">Upload PDF files to see the pages here</p>`;
        updateMergeButtonState();
        return;
    }

    pages.forEach((p, idx) => {
        const div = document.createElement("div");
        div.className = "bg-gray-800 p-1 rounded-xl shadow relative flex flex-col items-center justify-center aspect-[3/4] w-full overflow-hidden select-none group";
        
        div.dataset.id = p.id;
        div.dataset.file = p.file;

        // Current Order Badge (1, 2, 3...)
        const num = document.createElement("span");
        num.className = "page-number-badge absolute top-1 left-1 bg-indigo-600 text-white text-xs w-6 h-6 flex items-center justify-center rounded-full shadow z-10 font-bold";
        num.textContent = idx + 1;
        div.appendChild(num);

        if (pageCache[p.id]) {
            appendImageToCard(div, pageCache[p.id], p);
        } else {
            const skeleton = document.createElement("div");
            skeleton.id = `skeleton-${p.id}`;
            skeleton.className = "w-full h-full bg-gray-700 animate-pulse rounded flex items-center justify-center text-center p-2";
            // FIXED: Show the "Filename - Pg X" even on the skeleton
            skeleton.innerHTML = `<span class="text-gray-500 text-[10px] break-all">${p.originalFile}<br>Pg ${p.originalPage}</span>`;
            div.appendChild(skeleton);
            
            renderingQueue.push({ id: p.id, file: p.file, index: p.pageIndex });
            imageObserver.observe(div);
        }

        // --- ACTION BUTTONS (ALWAYS VISIBLE NOW) ---
        const buttonGroup = document.createElement("div");
        // FIXED: Removed 'opacity-0' and hover logic. Added bg-black/40 backdrop for visibility on light pages
        buttonGroup.className = "absolute bottom-1 right-1 flex gap-1 z-20 bg-black/40 rounded p-1 backdrop-blur-sm";
        
        // Zoom
        const zoomBtn = createIconBtn("Zoom", "bg-gray-600 hover:bg-gray-700", () => openModal(p));
        zoomBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>`;
        buttonGroup.appendChild(zoomBtn);

        // Rotate
        const rotateBtn = createIconBtn("Rotate", "bg-blue-600 hover:bg-blue-700", () => {
            const pageToRotate = pages.find(page => page.id === p.id);
            pageToRotate.rotation = (pageToRotate.rotation + 90) % 360;
            const img = div.querySelector("img");
            if (img) updateImageTransform(img, pageToRotate.rotation);
        });
        rotateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-4.991-2.695v4.992h-4.992" /></svg>`;
        buttonGroup.appendChild(rotateBtn);
        div.appendChild(buttonGroup);

        // Delete (Always visible)
        const delBtn = document.createElement("button");
        delBtn.textContent = "✕";
        delBtn.className = "absolute top-1 right-1 bg-red-600 hover:bg-red-700 rounded-full w-6 h-6 text-xs flex items-center justify-center transition active:scale-90 z-20 shadow-sm";
        delBtn.onclick = () => deletePage(p.id);
        div.appendChild(delBtn);

        pagesContainer.appendChild(div);
    });

    processQueue();

    Sortable.create(pagesContainer, {
        animation: 150,
        delay: 50,
        delayOnTouchOnly: true,
        onEnd: () => {
            const newOrder = [];
            Array.from(pagesContainer.children).forEach(el => {
                const id = el.dataset.id;
                newOrder.push(pages.find(p => p.id === id));
            });
            pages = newOrder;
            refreshPageNumbers();
        },
    });

    updateMergeButtonState();
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
    img.className = "rounded max-w-full max-h-full object-contain transition-all duration-500 opacity-0"; 
    
    updateImageTransform(img, pageData.rotation);
    
    // Insert before buttons
    container.insertBefore(img, container.querySelector('.absolute.bottom-1'));
    
    requestAnimationFrame(() => img.classList.remove("opacity-0"));

    // FIXED: Restored the Label "Filename - Pg X"
    const label = document.createElement("span");
    label.className = "absolute bottom-1 left-1 bg-black/60 px-2 py-0.5 text-[10px] rounded text-white truncate max-w-[calc(100%-4rem)] z-10 pointer-events-none";
    label.textContent = `${pageData.originalFile} - Pg ${pageData.originalPage}`;
    label.title = `${pageData.originalFile} - Page ${pageData.originalPage}`;
    container.appendChild(label);
}

// --- UTILITY FUNCTIONS ---

function deletePage(id) {
    pages = pages.filter(page => page.id !== id);
    renderingQueue = renderingQueue.filter(item => item.id !== id);
    
    const card = document.querySelector(`div[data-id="${id}"]`);
    if (card) card.remove();
    
    releasePageMemory(id);
    refreshPageNumbers();
    updateMergeButtonState();
}

function releasePageMemory(id) {
    if (pageCache[id]) {
        URL.revokeObjectURL(pageCache[id]);
        delete pageCache[id];
    }
    if (highResPageCache[id]) {
        URL.revokeObjectURL(highResPageCache[id]);
        delete highResPageCache[id];
    }
}

function resetApplication() {
    renderingQueue = [];
    isRendering = false;

    pages = [];
    fileMap = {};
    uploadedFiles = [];

    // Clear Image Caches
    Object.keys(pageCache).forEach(id => URL.revokeObjectURL(pageCache[id]));
    pageCache = {};
    
    Object.keys(highResPageCache).forEach(id => URL.revokeObjectURL(highResPageCache[id]));
    highResPageCache = {};

    // DESTROY PDF DOCS TO FREE MEMORY
    Object.keys(loadedPdfDocs).forEach(filename => {
        if (loadedPdfDocs[filename]) {
            // PDF.js destroy method
            loadedPdfDocs[filename].destroy(); 
        }
    });
    loadedPdfDocs = {};

    pagesContainer.innerHTML = `<p class="text-gray-500 col-span-full text-center py-10">Upload PDF files to see the pages here</p>`;
    fileListUl.innerHTML = "";
    fileListContainer.classList.add("hidden");
    newNameInput.value = "";
    
    updateMergeButtonState();
    setLoadingState(mergeBtn, false, "Merge PDFs");
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showFileList() {
    fileListUl.innerHTML = "";
    uploadedFiles.forEach((fileInfo, idx) => {
        const li = document.createElement("li");
        li.className = "flex items-center justify-between bg-gray-700 px-3 py-2 rounded text-sm text-white";
        li.innerHTML = `<span>${idx + 1}. ${fileInfo.original}</span>`;
        
        const delBtn = document.createElement("button");
        delBtn.textContent = "✕";
        delBtn.className = "ml-2 bg-red-600 hover:bg-red-700 rounded-full w-6 h-6 flex items-center justify-center text-xs";
        
        delBtn.onclick = () => {
            const pagesToRemove = pages.filter(p => p.file === fileInfo.filename);
            pagesToRemove.forEach(p => deletePage(p.id));

            if (loadedPdfDocs[fileInfo.filename]) {
                loadedPdfDocs[fileInfo.filename].destroy();
                delete loadedPdfDocs[fileInfo.filename];
            }

            uploadedFiles = uploadedFiles.filter(uf => uf.filename !== fileInfo.filename);
            delete fileMap[fileInfo.filename];
            
            showFileList();
        };
        li.appendChild(delBtn);
        fileListUl.appendChild(li);
    });
    fileListContainer.classList.toggle("hidden", uploadedFiles.length === 0);
}

function refreshPageNumbers() {
    const cards = pagesContainer.children;
    Array.from(cards).forEach((card, index) => {
        const badge = card.querySelector('.page-number-badge');
        if (badge) badge.textContent = index + 1;
    });
}

function updateImageTransform(img, rotation) {
    let transform = `rotate(${rotation || 0}deg)`;
    if (rotation === 90 || rotation === 270) {
        transform += ` scale(0.75)`;
    }
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

function createIconBtn(title, bgClass, onClick) {
    const btn = document.createElement("button");
    btn.className = `${bgClass} rounded-full w-6 h-6 flex items-center justify-center transition active:scale-90`;
    btn.onclick = (e) => { e.stopPropagation(); onClick(e); };
    return btn;
}

function updateMergeButtonState() {
    const hasPages = pages.length > 0;
    mergeBtn.disabled = !hasPages;
    newNameInput.disabled = !hasPages;
}

// --- MODAL & HIGH RES PREVIEW ---

async function openModal(page) {
    modalOverlay.classList.remove("hidden");
    modalImage.classList.add("hidden");
    modalLoader.classList.remove("hidden");
    
    const highResSrc = await getHighResPageDataUrl(page);
    modalImage.src = highResSrc;
    modalImage.style.transform = `rotate(${page.rotation || 0}deg)`;
    
    modalLoader.classList.add("hidden");
    modalImage.classList.remove("hidden");
}

function closeModal() {
    modalOverlay.classList.add("hidden");
    modalImage.src = "";
}

async function getHighResPageDataUrl(page) {
    if (highResPageCache[page.id]) return highResPageCache[page.id];

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