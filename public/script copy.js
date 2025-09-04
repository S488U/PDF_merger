let pages = [];
let fileMap = {};
let uploadedFiles = [];
let pageCache = {}; // 🗂️ memory cache {id: dataURL}

// Upload form
document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData();
  const files = document.getElementById("pdfs").files;
  for (const f of files) formData.append("pdfs", f);

  const res = await fetch("/upload", { method: "POST", body: formData });
  const data = await res.json();

  pages = pages.concat(data.pages);
  fileMap = { ...fileMap, ...data.fileMap };
  uploadedFiles = uploadedFiles.concat(data.fileNames);

  showFileList();
  renderPages(true); // 👈 first render with skeletons
  await cachePages(data.pages); // load previews into memory
  renderPages(); // replace skeletons with actual previews
});

// Show uploaded PDF names with remove button
function showFileList() {
  const ul = document.getElementById("fileListUl");
  ul.innerHTML = "";

  uploadedFiles.forEach((f, idx) => {
    const li = document.createElement("li");
    li.className =
      "flex items-center justify-between bg-gray-700 px-3 py-2 rounded mb-1 text-sm text-white";

    const span = document.createElement("span");
    span.textContent = `${idx + 1}. ${f.original}`;
    li.appendChild(span);

    const delBtn = document.createElement("button");
    delBtn.textContent = "✕";
    delBtn.className =
      "ml-2 bg-red-600 hover:bg-red-700 rounded-full w-6 h-6 flex items-center justify-center text-xs";
    delBtn.onclick = () => {
      uploadedFiles = uploadedFiles.filter((uf) => uf.filename !== f.filename);
      pages = pages.filter((p) => p.file !== f.filename);
      delete fileMap[f.filename];
      showFileList();
      renderPages();
    };
    li.appendChild(delBtn);

    ul.appendChild(li);
  });

  document.getElementById("fileList").classList.remove("hidden");
}

// 🗂️ Cache PDF pages to memory (with skeletons already in place)
async function cachePages(newPages) {
  for (const p of newPages) {
    if (pageCache[p.id]) continue; // already cached

    const pdfBytes = await fetch(`/uploads/${p.file}`).then((r) =>
      r.arrayBuffer()
    );
    const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
    const page = await pdf.getPage(p.pageIndex + 1);

    const viewport = page.getViewport({ scale: 0.3 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;
    pageCache[p.id] = canvas.toDataURL(); // store in memory
  }
}

// Render pages
// skeleton = true → show skeleton placeholders
function renderPages(skeleton = false) {
  const container = document.getElementById("pagesContainer");
  container.innerHTML = "";

  pages.forEach((p, idx) => {
    const div = document.createElement("div");
    div.className =
      "bg-gray-800 p-2 rounded-xl shadow relative flex flex-col items-center aspect-[3/4] w-40";
    div.dataset.id = p.id;

    // Column number
    const num = document.createElement("span");
    num.className =
      "absolute -top-2 -left-2 bg-indigo-600 text-white text-xs w-6 h-6 flex items-center justify-center rounded-full shadow";
    num.textContent = idx + 1;
    div.appendChild(num);

    // Page number
    const label = document.createElement("span");
    label.className =
      "absolute bottom-1 left-1 bg-black/50 px-2 text-xs rounded text-white";
    label.textContent = `Pg ${p.pageIndex + 1}`;
    div.appendChild(label);

    // Delete page button
    const delBtn = document.createElement("button");
    delBtn.textContent = "✕";
    delBtn.className =
      "absolute top-1 right-1 bg-red-600 hover:bg-red-700 rounded-full w-6 h-6 text-xs flex items-center justify-center";
    delBtn.onclick = () => {
      pages = pages.filter((page) => page.id !== p.id);
      renderPages();
    };
    div.appendChild(delBtn);

    // Either skeleton or actual preview
    if (skeleton || !pageCache[p.id]) {
      const skeletonBox = document.createElement("div");
      skeletonBox.className =
        "w-full h-full bg-gray-600 animate-pulse rounded";
      div.appendChild(skeletonBox);
    } else {
      const img = document.createElement("img");
      img.src = pageCache[p.id];
      img.className = "rounded max-w-full max-h-full object-contain";
      div.appendChild(img);
    }

    container.appendChild(div);
  });

  // Enable drag & drop
  Sortable.create(container, {
    animation: 150,
    onEnd: () => {
      const newOrder = [];
      container.querySelectorAll("div").forEach((el, idx) => {
        const id = el.dataset.id;
        const pageObj = pages.find((p) => p.id === id);
        newOrder.push(pageObj);

        // update number instantly
        el.querySelector("span").textContent = idx + 1;
      });
      pages = newOrder;
    },
  });
}

// Merge PDFs
document.getElementById("mergeBtn").addEventListener("click", async () => {
  if (pages.length === 0) {
    alert("No pages to merge!");
    return;
  }

  const newName = document.getElementById("newName").value || "merged";

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
  } else {
    alert("Merge failed!");
  }
});
