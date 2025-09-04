// script.js (Corrected and Complete)

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

let pages = [];
let fileMap = {};
let uploadedFiles = [];
let pageCache = {}; // Cache for low-res thumbnails
let highResPageCache = {}; // Cache for high-res previews

// DOM Elements
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
            fileMap = { ...fileMap,
                ...data.fileMap
            };
            uploadedFiles = uploadedFiles.concat(data.fileNames);
            showFileList();
            renderPages(true);
            await cachePagesBatched(data.pages);
            renderPages();
        } else {
            console.error("Upload failed:", xhr.responseText);
            alert("An error occurred during upload. Please check the console.");
        }
    };
    xhr.onerror = function() {
        setLoadingState(uploadBtn, false, "Upload");
        progressContainer.classList.add("hidden");
        alert("A network error occurred. Please try again.");
    };
    xhr.upload.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            progressBar.style.width = percentComplete + '%';
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
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                order: pages,
                fileMap,
                newName
            }),
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
        } else {
            const errData = await res.json();
            throw new Error(errData.error || "Merge failed on server");
        }
    } catch (error) {
        console.error("Merge failed:", error);
        alert(`An error occurred during merge: ${error.message}`);
    } finally {
        setLoadingState(mergeBtn, false, "Merge PDFs");
    }
});

modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
        closeModal();
    }
});
window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalOverlay.classList.contains("hidden")) {
        closeModal();
    }
});


// --- UI FUNCTIONS ---

function setLoadingState(button, isLoading, loadingText) {
    button.disabled = isLoading;
    if (isLoading) {
        button.dataset.originalText = button.textContent;
        button.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            ${loadingText}
        `;
    } else {
        button.innerHTML = button.dataset.originalText || button.textContent;
    }
}

function updateMergeButtonState() {
    const hasPages = pages.length > 0;
    mergeBtn.disabled = !hasPages;
    newNameInput.disabled = !hasPages;
}

function showFileList() {
    fileListUl.innerHTML = "";
    uploadedFiles.forEach((fileInfo, idx) => {
        const li = document.createElement("li");
        li.className = "flex items-center justify-between bg-gray-700 px-3 py-2 rounded text-sm text-white";
        const span = document.createElement("span");
        span.textContent = `${idx + 1}. ${fileInfo.original}`;
        li.appendChild(span);
        const delBtn = document.createElement("button");
        delBtn.textContent = "✕";
        delBtn.className = "ml-2 bg-red-600 hover:bg-red-700 rounded-full w-6 h-6 flex items-center justify-center text-xs transition active:scale-90";
        delBtn.onclick = () => {
            const pagesToRemove = pages.filter(p => p.file === fileInfo.filename);
            pagesToRemove.forEach(p => {
                delete pageCache[p.id];
                delete highResPageCache[p.id];
            });
            uploadedFiles = uploadedFiles.filter((uf) => uf.filename !== fileInfo.filename);
            pages = pages.filter((p) => p.file !== fileInfo.filename);
            delete fileMap[fileInfo.filename];
            renderPages();
            showFileList();
        };
        li.appendChild(delBtn);
        fileListUl.appendChild(li);
    });
    fileListContainer.classList.toggle("hidden", uploadedFiles.length === 0);
}

function renderPages(skeleton = false) {
    pagesContainer.innerHTML = "";
    if (pages.length === 0) {
        pagesContainer.innerHTML = `<p class="text-gray-500 col-span-full text-center py-10">Upload PDF files to see the pages here</p>`;
        updateMergeButtonState();
        return;
    }
    pages.forEach((p, idx) => {
        const div = document.createElement("div");
        div.className = "bg-gray-800 p-1 rounded-xl shadow relative flex flex-col items-center justify-center aspect-[3/4] w-full overflow-hidden";
        div.dataset.id = p.id;
        const num = document.createElement("span");
        num.className = "absolute top-1 left-1 bg-indigo-600 text-white text-xs w-6 h-6 flex items-center justify-center rounded-full shadow z-10";
        num.textContent = idx + 1;
        div.appendChild(num);
        if (skeleton || !pageCache[p.id]) {
            const skeletonBox = document.createElement("div");
            skeletonBox.className = "w-full h-full bg-gray-600 animate-pulse rounded";
            div.appendChild(skeletonBox);
        } else {
            const img = document.createElement("img");
            img.src = pageCache[p.id];
            img.className = "rounded max-w-full max-h-full object-contain transition-transform duration-200";
            let transformStyle = `rotate(${p.rotation || 0}deg)`;
            if (p.rotation === 90 || p.rotation === 270) {
                transformStyle += ` scale(0.75)`;
            }
            img.style.transform = transformStyle;
            div.appendChild(img);
            const label = document.createElement("span");
            label.className = "absolute bottom-1 left-1 bg-black/60 px-2 py-0.5 text-xs rounded text-white truncate max-w-[calc(100%-0.5rem)]";
            label.textContent = `${p.originalFile} - Pg ${p.originalPage}`;
            label.title = `${p.originalFile} - Page ${p.originalPage}`;
            div.appendChild(label);
            const buttonGroup = document.createElement("div");
            buttonGroup.className = "absolute bottom-1 right-1 flex gap-1";
            const zoomBtn = document.createElement("button");
            zoomBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>`;
            zoomBtn.className = "bg-gray-600 hover:bg-gray-700 rounded-full w-6 h-6 flex items-center justify-center transition active:scale-90";
            zoomBtn.onclick = (e) => {
                e.stopPropagation();
                openModal(p);
            };
            buttonGroup.appendChild(zoomBtn);
            const rotateBtn = document.createElement("button");
            rotateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-4.991-2.695v4.992h-4.992" /></svg>`;
            rotateBtn.className = "bg-blue-600 hover:bg-blue-700 rounded-full w-6 h-6 flex items-center justify-center transition active:scale-90";
            rotateBtn.onclick = (e) => {
                e.stopPropagation();
                const pageToRotate = pages.find(page => page.id === p.id);
                pageToRotate.rotation = (pageToRotate.rotation + 90) % 360;
                renderPages();
            };
            buttonGroup.appendChild(rotateBtn);
            div.appendChild(buttonGroup);
            const delBtn = document.createElement("button");
            delBtn.textContent = "✕";
            delBtn.className = "absolute top-1 right-1 bg-red-600 hover:bg-red-700 rounded-full w-6 h-6 text-xs flex items-center justify-center transition active:scale-90";
            delBtn.onclick = () => {
                pages = pages.filter(page => page.id !== p.id);
                delete pageCache[p.id];
                delete highResPageCache[p.id];
                renderPages();
            };
            div.appendChild(delBtn);
            div.onauxclick = (e) => {
                if (e.button === 1) {
                    e.preventDefault();
                    const idToRemove = e.currentTarget.dataset.id;
                    pages = pages.filter(page => page.id !== idToRemove);
                    delete pageCache[idToRemove];
                    delete highResPageCache[idToRemove];
                    renderPages();
                }
            };
        }
        pagesContainer.appendChild(div);
    });
    Sortable.create(pagesContainer, {
        animation: 150,
        delay: 50,
        delayOnTouchOnly: true,
        onEnd: (evt) => {
            const newOrder = [];
            Array.from(pagesContainer.children).forEach(el => {
                const id = el.dataset.id;
                const pageObj = pages.find(p => p.id === id);
                newOrder.push(pageObj);
            });
            pages = newOrder;
            renderPages();
        },
    });
    updateMergeButtonState();
}


// --- UTILITY FUNCTIONS ---

async function cachePagesBatched(newPages, batchSize = 5) {
    for (let i = 0; i < newPages.length; i += batchSize) {
        const batch = newPages.slice(i, i + batchSize);
        await Promise.all(batch.map(async (p) => {
            if (pageCache[p.id]) return;
            try {
                const pdfBytes = await fetch(`/uploads/${p.file}`).then(r => r.arrayBuffer());
                const pdf = await pdfjsLib.getDocument({
                    data: pdfBytes
                }).promise;
                const page = await pdf.getPage(p.pageIndex + 1);
                const viewport = page.getViewport({
                    scale: 0.5
                });
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({
                    canvasContext: context,
                    viewport
                }).promise;
                pageCache[p.id] = canvas.toDataURL("image/jpeg", 0.8);
            } catch (error) {
                console.error(`Failed to render page ${p.id}:`, error);
            }
        }));
        renderPages();
    }
}

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
    if (highResPageCache[page.id]) {
        return highResPageCache[page.id];
    }
    try {
        const pdfBytes = await fetch(`/uploads/${page.file}`).then(r => r.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({
            data: pdfBytes
        }).promise;
        const pdfPage = await pdf.getPage(page.pageIndex + 1);
        const viewport = pdfPage.getViewport({
            scale: 2.0
        });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await pdfPage.render({
            canvasContext: context,
            viewport
        }).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        highResPageCache[page.id] = dataUrl;
        return dataUrl;
    } catch (error) {
        console.error(`Failed to render high-res page ${page.id}:`, error);
        return "";
    }
}