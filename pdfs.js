// PDF Documents Library
pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';

let pdfs = [];
let pdfUnsubscribe = null;
let activeTab = 'notes';

const MAX_PDF_SIZE_MB = 50;
const MAX_PDF_SIZE = MAX_PDF_SIZE_MB * 1024 * 1024;

const pdfReaderState = {
    pdf: null,
    docId: null,
    page: 1,
    pageCount: 0,
    zoom: 1,
    fit: false,
    renderTask: null,
    saveTimer: null
};

// ---- Local (browser) PDF storage fallback -----------------------------
// Firebase Cloud Storage now requires a paid (Blaze) plan. To keep PDFs
// working for free, we save the file bytes in this browser's IndexedDB and
// keep only metadata (title, page count, progress) in Firestore.
// Documents saved this way are only available on THIS device/browser.
const LOCAL_PREFIX = 'imo-local://';
let localDbPromise = null;

function openLocalDb() {
    if (localDbPromise) return localDbPromise;
    localDbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open('imo-local-files', 1);
        req.onupgradeneeded = () => {
            const d = req.result;
            if (!d.objectStoreNames.contains('pdfs')) {
                d.createObjectStore('pdfs', { keyPath: 'key' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    return localDbPromise;
}

function localKeyFromUrl(url) {
    return String(url).slice(LOCAL_PREFIX.length);
}

function isLocalUrl(url) {
    return typeof url === 'string' && url.indexOf(LOCAL_PREFIX) === 0;
}

function localPutPdf(key, file) {
    return openLocalDb().then((db) => new Promise((resolve, reject) => {
        const tx = db.transaction('pdfs', 'readwrite');
        tx.objectStore('pdfs').put({ key, blob: file, name: file.name, size: file.size, type: file.type });
        tx.oncomplete = () => resolve(key);
        tx.onerror = () => reject(tx.error);
    }));
}

function localGetPdf(key) {
    return openLocalDb().then((db) => new Promise((resolve, reject) => {
        const tx = db.transaction('pdfs', 'readonly');
        const req = tx.objectStore('pdfs').get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    }));
}

function localDeletePdf(key) {
    return openLocalDb().then((db) => new Promise((resolve, reject) => {
        const tx = db.transaction('pdfs', 'readwrite');
        tx.objectStore('pdfs').delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    }));
}


const pdfEls = {
    tabNotes: document.getElementById('tab-notes-btn'),
    tabDocs: document.getElementById('tab-docs-btn'),
    notesContainer: document.getElementById('notes-container'),
    docsContainer: document.getElementById('docs-container'),
    newNoteBtn: document.getElementById('new-note-btn'),
    addPdfBtn: document.getElementById('add-pdf-btn'),
    pdfUploadInput: document.getElementById('pdf-upload-input'),
    readerModal: document.getElementById('pdf-reader-modal'),
    readerBack: document.getElementById('pdf-reader-back'),
    readerDownload: document.getElementById('pdf-download-btn'),
    readerTitle: document.getElementById('pdf-reader-title'),
    readerPageLabel: document.getElementById('pdf-reader-page-label'),
    pdfContainer: document.getElementById('pdf-pages'),
    readerBody: document.querySelector('.pdf-reader-body'),
    zoomIn: document.getElementById('pdf-zoom-in'),
    zoomOut: document.getElementById('pdf-zoom-out'),
    prevPage: document.getElementById('pdf-prev-page'),
    nextPage: document.getElementById('pdf-next-page'),
    uploadProgress: document.getElementById('upload-progress'),
    uploadProgressLabel: document.getElementById('upload-progress-label'),
    uploadProgressPct: document.getElementById('upload-progress-pct'),
    uploadProgressBar: document.getElementById('upload-progress-bar')
};

function pdfsCol() {
    if (!db || !auth || !auth.currentUser) return null;
    return db.collection('users').doc(auth.currentUser.uid).collection('pdfs');
}

function switchTab(tab) {
    activeTab = tab;
    const isDocs = tab === 'docs';
    pdfEls.tabNotes.classList.toggle('active', !isDocs);
    pdfEls.tabDocs.classList.toggle('active', isDocs);
    pdfEls.notesContainer.style.display = isDocs ? 'none' : 'block';
    pdfEls.docsContainer.style.display = isDocs ? 'block' : 'none';
    pdfEls.newNoteBtn.style.display = isDocs ? 'none' : 'inline-flex';
    pdfEls.addPdfBtn.style.display = isDocs ? 'inline-flex' : 'none';
}

function startPdfsSync() {
    if (!db || !auth || !auth.currentUser) return;
    if (pdfUnsubscribe) {
        pdfUnsubscribe();
        pdfUnsubscribe = null;
    }

    try {
        pdfUnsubscribe = pdfsCol().orderBy('updatedAt', 'desc')
            .onSnapshot((snapshot) => {
                pdfs = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        title: data.title || 'Untitled',
                        storageUrl: data.storageUrl || '',
                        storagePath: data.storagePath || '',
                        size: data.size || 0,
                        pageCount: data.pageCount || 0,
                        lastPage: data.lastPage || 0,
                        createdAt: getDateFromValue(data.createdAt),
                        updatedAt: getDateFromValue(data.updatedAt),
                        lastReadAt: data.lastReadAt ? getDateFromValue(data.lastReadAt) : null
                    };
                });
                renderPdfList();
            }, (error) => {
                console.error('PDF sync error:', error);
                if (error && error.code === 'permission-denied') {
                    showToast('Docs sync blocked: Firestore security rules need updating.', 'error');
                }
            });
    } catch (error) {
        console.error('Error starting PDF sync:', error);
    }
}

function resetPdfs() {
    if (pdfUnsubscribe) {
        pdfUnsubscribe();
        pdfUnsubscribe = null;
    }
    pdfs = [];
    if (pdfReaderState.pdf) {
        try { pdfReaderState.pdf.destroy(); } catch (e) { /* ignore */ }
    }
    pdfReaderState.pdf = null;
    pdfReaderState.docId = null;
    pdfReaderState.renderTask = null;
    if (pdfReaderState.saveTimer) {
        clearTimeout(pdfReaderState.saveTimer);
        pdfReaderState.saveTimer = null;
    }
    pdfEls.readerModal.classList.remove('open');
    switchTab('notes');
    renderPdfList();
}

function formatReadTime(date) {
    if (!date) return '';
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

function renderPdfList() {
    const sorted = [...pdfs].sort((a, b) => {
        const aTime = a.lastReadAt ? a.lastReadAt.getTime() : 0;
        const bTime = b.lastReadAt ? b.lastReadAt.getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;
        return b.updatedAt - a.updatedAt;
    });

    if (sorted.length === 0) {
        pdfEls.docsContainer.innerHTML = `
            <div class="empty-state">
                <p class="empty-icon">📄</p>
                <h2>No documents yet</h2>
                <p>Upload a PDF to read it here anytime.</p>
            </div>
        `;
        return;
    }

    pdfEls.docsContainer.innerHTML = '';

    sorted.forEach(pdf => {
        const pct = pdf.pageCount ? Math.min(100, Math.round((pdf.lastPage / pdf.pageCount) * 100)) : 0;
        const metaParts = [];
        if (isLocalUrl(pdf.storageUrl)) {
            metaParts.push('💻 This device');
        }
        if (pdf.lastPage) {
            metaParts.push(`Page <strong>${pdf.lastPage}</strong> of ${pdf.pageCount || '?'}`);
        } else if (pdf.pageCount) {
            metaParts.push(`${pdf.pageCount} pages`);
        }
        if (pdf.size) metaParts.push(formatFileSize(pdf.size));
        if (pdf.lastReadAt) metaParts.push(`Last read ${formatReadTime(pdf.lastReadAt)}`);

        const card = document.createElement('div');
        card.className = 'pdf-card';
        card.innerHTML = `
            <div class="pdf-card-info">
                <div class="pdf-card-title-row">
                    <span class="pdf-card-icon">📕</span>
                    <h3 class="pdf-card-title">${escapeHtml(pdf.title)}</h3>
                </div>
                <div class="pdf-card-meta">${metaParts.join(' · ')}</div>
                <div class="pdf-progress">
                    <div class="pdf-progress-bar" style="width: ${pct}%"></div>
                </div>
            </div>
            <div class="pdf-card-actions">
                <button class="btn btn-primary pdf-open-btn">${pdf.lastPage ? `▶ Continue (p. ${pdf.lastPage})` : '▶ Read'}</button>
                <button class="btn btn-secondary pdf-download-btn" title="Download PDF">⬇</button>
                <button class="btn btn-secondary pdf-delete-btn" title="Delete document">🗑️</button>
            </div>
        `;

        card.querySelector('.pdf-open-btn').addEventListener('click', () => openPdfReader(pdf.id));
        card.querySelector('.pdf-download-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            downloadPdf(pdf.id);
        });
        card.querySelector('.pdf-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deletePdf(pdf.id);
        });
        card.querySelector('.pdf-card-info').addEventListener('click', () => openPdfReader(pdf.id));
        pdfEls.docsContainer.appendChild(card);
    });
}

function showUploadProgress(label) {
    pdfEls.uploadProgressLabel.textContent = label || 'Uploading…';
    pdfEls.uploadProgressPct.textContent = '0%';
    pdfEls.uploadProgressBar.style.width = '0%';
    pdfEls.uploadProgress.style.display = 'block';
}

function updateUploadProgress(frac) {
    const pct = Math.round(frac * 100);
    pdfEls.uploadProgressBar.style.width = pct + '%';
    pdfEls.uploadProgressPct.textContent = pct + '%';
}

function hideUploadProgress() {
    pdfEls.uploadProgress.style.display = 'none';
}

async function handlePdfUpload(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
        showToast('Please choose a PDF file.', 'error');
        return;
    }
    if (file.size > MAX_PDF_SIZE) {
        showToast(`PDF too large (max ${MAX_PDF_SIZE_MB}MB)`, 'error');
        return;
    }
    if (!auth || !auth.currentUser) {
        showToast('Please sign in first.', 'error');
        return;
    }

    const uid = auth.currentUser.uid;
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.pdf`;

    showUploadProgress(`Uploading ${file.name}…`);

    let storageUrl = '';
    let storagePath = '';

    // Try cloud storage first. NOTE: Firebase Cloud Storage now requires a
    // paid (Blaze) plan, so on the free plan this will either fail or hang.
    // We fall back to saving the file in this browser (IndexedDB) for free.
    try {
        if (!storage) throw new Error('Cloud storage not configured');
        const ref = storage.ref('pdfs').child(uid).child(fileName);
        storagePath = ref.fullPath;
        const cloudPromise = new Promise((resolve, reject) => {
            const task = ref.put(file);
            task.on('state_changed',
                (snapshot) => updateUploadProgress(snapshot.bytesTransferred / snapshot.totalBytes),
                (error) => reject(error),
                () => resolve(task.snapshot.ref.getDownloadURL())
            );
        });
        // If cloud storage stalls (common on the free plan), fall back to local
        // storage instead of leaving the progress bar stuck at 0%.
        storageUrl = await Promise.race([
            cloudPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Cloud upload timed out (free Starter plan needs paid Blaze for storage).')), 8000))
        ]);
    } catch (cloudError) {
        console.warn('Cloud upload unavailable; saving locally instead:', cloudError);
        try {
            showUploadProgress(`Saving ${file.name} on this device…`);
            const localKey = `${uid}/${fileName}`;
            await localPutPdf(localKey, file);
            updateUploadProgress(1);
            storageUrl = LOCAL_PREFIX + localKey;
            storagePath = '';
        } catch (localError) {
            hideUploadProgress();
            console.error('Local PDF save error:', localError);
            showToast('Upload failed: ' + (localError.message || 'Unknown error'), 'error');
            return;
        }
    }

    pdfEls.uploadProgressLabel.textContent = 'Counting pages…';
    const pageCount = await countPdfPages(file);
    hideUploadProgress();

    const col = pdfsCol();
    if (!col) return;

    try {
        const docRef = await col.add({
            title: file.name.replace(/\.pdf$/i, ''),
            storageUrl,
            storagePath,
            size: file.size,
            pageCount,
            lastPage: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastReadAt: null
        });

        if (isLocalUrl(storageUrl)) {
            showToast('✅ Saved on this device (cloud upload needs a paid plan)', 'success');
        } else {
            showToast('✅ Uploaded — opening…', 'success');
        }
        openPdfReader(docRef.id);
    } catch (error) {
        hideUploadProgress();
        console.error('PDF metadata save error:', error);
        if (error && error.code === 'permission-denied') {
            showToast('Docs sync blocked: Firestore security rules need updating.', 'error');
        } else {
            showToast('Failed to save document: ' + (error.message || 'Unknown error'), 'error');
        }
    }
}

async function countPdfPages(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const count = doc.numPages;
        doc.destroy();
        return count;
    } catch (error) {
        console.warn('Could not count pages:', error);
        return 0;
    }
}

async function openPdfReader(pdfId) {
    const pdf = pdfs.find(p => p.id === pdfId);
    if (!pdf || !pdf.storageUrl) {
        showToast('This document has no file attached.', 'error');
        return;
    }

    try {
        pdfReaderState.docId = pdfId;
        pdfReaderState.zoom = 1;
        pdfReaderState.fit = true;
        pdfEls.readerTitle.textContent = pdf.title;
        pdfEls.readerPageLabel.textContent = 'Loading…';
        pdfEls.readerModal.classList.add('open');

        let pdfSource;
        if (isLocalUrl(pdf.storageUrl)) {
            const rec = await localGetPdf(localKeyFromUrl(pdf.storageUrl));
            if (!rec || !rec.blob) {
                throw new Error('This PDF is stored on this device only. Open it from the device/browser where it was uploaded.');
            }
            const buffer = await rec.blob.arrayBuffer();
            pdfSource = { data: buffer };
        } else {
            pdfSource = { url: pdf.storageUrl };
        }

        pdfReaderState.pdf = await pdfjsLib.getDocument(pdfSource).promise;
        pdfReaderState.pageCount = pdfReaderState.pdf.numPages;

        if (pdf.pageCount !== pdfReaderState.pageCount) {
            updatePdfDoc(pdfId, { pageCount: pdfReaderState.pageCount });
        }

        pdfReaderState.page = Math.min(Math.max(1, pdf.lastPage || 1), pdfReaderState.pageCount);
        await renderPdfDocument();

        // Render the initial viewport pages, then jump to the resume page.
        requestAnimationFrame(() => {
            renderVisiblePages();
            scrollToPage(pdfReaderState.page);
        });

        if (pdf.lastPage > 1) {
            showToast(`Resumed at page ${pdfReaderState.page}`);
        }
    } catch (error) {
        console.error('PDF open error:', error);
        showToast('Failed to open PDF: ' + (error.message || 'Unknown error'), 'error');
        closePdfReader();
    }
}

async function renderPdfDocument() {
    const state = pdfReaderState;
    if (!state.pdf) return;

    const body = pdfEls.readerBody;
    const container = pdfEls.pdfContainer;
    if (container) container.innerHTML = '';

    // Per-document render bookkeeping.
    state.data = new Map();      // wrap element -> { page, viewport }
    state.rendered = new Set();  // wrap elements already drawn

    // First render of a document: auto-fit the page width to the reader.
    if (state.fit) {
        state.fit = false;
        try {
            const first = await state.pdf.getPage(1);
            const base = first.getViewport({ scale: 1 });
            const avail = (body ? body.clientWidth : base.width) - 56;
            state.zoom = avail > 0 ? Math.max(0.3, avail / base.width) : 1;
        } catch (e) {
            state.zoom = 1;
        }
    }

    const dpr = window.devicePixelRatio || 1;

    // Create a wrapper + canvas for every page (sized for high-DPI so text
    // stays crisp). Pages are rasterized lazily as they scroll into view.
    for (let i = 1; i <= state.pageCount; i++) {
        const page = await state.pdf.getPage(i);
        const viewport = page.getViewport({ scale: state.zoom * dpr });

        const wrap = document.createElement('div');
        wrap.className = 'pdf-page';

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = Math.floor(viewport.width / dpr) + 'px';
        canvas.style.height = Math.floor(viewport.height / dpr) + 'px';

        wrap.appendChild(canvas);
        if (container) container.appendChild(wrap);
        state.data.set(wrap, { page, viewport });
    }
}

function renderVisiblePages() {
    const state = pdfReaderState;
    const body = pdfEls.readerBody;
    if (!body || !state.data || !state.pdf) return;

    const bodyRect = body.getBoundingClientRect();
    const topLimit = bodyRect.top - 500;
    const bottomLimit = bodyRect.bottom + 500;

    state.data.forEach(({ page, viewport }, wrap) => {
        if (state.rendered.has(wrap)) return;
        const rect = wrap.getBoundingClientRect();
        if (rect.bottom < topLimit || rect.top > bottomLimit) return;
        state.rendered.add(wrap);
        const canvas = wrap.querySelector('canvas');
        if (canvas) {
            page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise.catch(() => {});
        }
    });
}

function getCurrentPageFromScroll() {
    const state = pdfReaderState;
    const body = pdfEls.readerBody;
    if (!body || !pdfEls.pdfContainer) return 1;
    const pages = pdfEls.pdfContainer.querySelectorAll('.pdf-page');
    if (!pages.length) return 1;
    const anchor = body.getBoundingClientRect().top + body.clientHeight * 0.35;
    for (let i = 0; i < pages.length; i++) {
        if (pages[i].getBoundingClientRect().bottom > anchor) return i + 1;
    }
    return pages.length;
}

function scrollToPage(target) {
    const state = pdfReaderState;
    const pages = pdfEls.pdfContainer ? pdfEls.pdfContainer.children : [];
    if (!pages.length) return;
    state.page = Math.max(1, Math.min(target, pages.length));
    const wrap = pages[state.page - 1];
    if (wrap && wrap.scrollIntoView) {
        wrap.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
}

function onReaderScroll() {
    const state = pdfReaderState;
    if (!state.pdf) return;
    const newPage = getCurrentPageFromScroll();
    state.page = newPage;
    pdfEls.readerPageLabel.textContent = `Page ${state.page} / ${state.pageCount} · ${Math.round(state.zoom * 100)}%`;
    renderVisiblePages();
    scheduleProgressSave();
}

function scheduleProgressSave() {
    clearTimeout(pdfReaderState.saveTimer);
    pdfReaderState.saveTimer = setTimeout(saveProgress, 600);
}

function saveProgress() {
    const state = pdfReaderState;
    if (!state.docId || !db || !auth || !auth.currentUser) return;
    const col = pdfsCol();
    if (!col) return;
    col.doc(state.docId).update({
        lastPage: state.page,
        lastReadAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch((error) => console.warn('Progress save failed:', error));
}

function updatePdfDoc(pdfId, fields) {
    const col = pdfsCol();
    if (!col) return;
    col.doc(pdfId).update(fields).catch((error) => console.warn('PDF update failed:', error));
}

function goToPage(delta) {
    scrollToPage(pdfReaderState.page + delta);
}

async function zoomPdf(delta) {
    const state = pdfReaderState;
    const anchor = state.page || 1;
    state.zoom = Math.min(5, Math.max(0.3, state.zoom + delta));
    await renderPdfDocument();
    scrollToPage(anchor);
    renderVisiblePages();
}

function closePdfReader() {
    if (pdfReaderState.saveTimer) {
        clearTimeout(pdfReaderState.saveTimer);
        pdfReaderState.saveTimer = null;
    }
    saveProgress();
    if (pdfReaderState.pdf) {
        try { pdfReaderState.pdf.destroy(); } catch (e) { /* ignore */ }
    }
    pdfReaderState.pdf = null;
    pdfReaderState.docId = null;
    pdfReaderState.renderTask = null;
    pdfReaderState.data = null;
    pdfReaderState.rendered = null;
    if (pdfEls.pdfContainer) pdfEls.pdfContainer.innerHTML = '';
    pdfEls.readerModal.classList.remove('open');
    renderPdfList();
}

async function deletePdf(pdfId) {
    const pdf = pdfs.find(p => p.id === pdfId);
    if (!pdf) return;
    if (!confirm(`Delete "${pdf.title}"? This removes it and its stored file.`)) return;

    if (pdfReaderState.docId === pdfId) {
        closePdfReader();
    }

    const col = pdfsCol();
    if (!col) return;

    try {
        await col.doc(pdfId).delete();
        if (isLocalUrl(pdf.storageUrl)) {
            await localDeletePdf(localKeyFromUrl(pdf.storageUrl)).catch(() => {});
        } else if (storage && pdf.storagePath) {
            await storage.ref(pdf.storagePath).delete().catch(() => {});
        }
        showToast('Document deleted 🗑️');
    } catch (error) {
        console.error('Delete PDF error:', error);
        showToast('Failed to delete: ' + error.message, 'error');
    }
}

async function downloadPdf(pdfId) {
    const pdf = pdfs.find(p => p.id === pdfId);
    if (!pdf || !pdf.storageUrl) return;

    try {
        showToast('Downloading…');
        let blob;
        if (isLocalUrl(pdf.storageUrl)) {
            const rec = await localGetPdf(localKeyFromUrl(pdf.storageUrl));
            if (!rec || !rec.blob) {
                throw new Error('File not found on this device (stored locally).');
            }
            blob = rec.blob;
        } else {
            const response = await fetch(pdf.storageUrl);
            if (!response.ok) {
                throw new Error('Download failed (' + response.status + ')');
            }
            blob = await response.blob();
        }
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = pdf.title.toLowerCase().endsWith('.pdf') ? pdf.title : pdf.title + '.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
        showToast('Downloaded 💾');
    } catch (error) {
        console.error('Download error:', error);
        showToast('Download failed: ' + (error.message || 'Unknown error'), 'error');
    }
}

pdfEls.tabNotes.addEventListener('click', () => switchTab('notes'));
pdfEls.tabDocs.addEventListener('click', () => switchTab('docs'));
pdfEls.addPdfBtn.addEventListener('click', () => pdfEls.pdfUploadInput.click());
pdfEls.pdfUploadInput.addEventListener('change', handlePdfUpload);
pdfEls.readerBack.addEventListener('click', closePdfReader);
pdfEls.prevPage.addEventListener('click', () => goToPage(-1));
pdfEls.nextPage.addEventListener('click', () => goToPage(1));
pdfEls.zoomIn.addEventListener('click', () => zoomPdf(0.25));
pdfEls.zoomOut.addEventListener('click', () => zoomPdf(-0.25));
pdfEls.readerModal.addEventListener('click', (e) => {
    if (e.target === pdfEls.readerModal) {
        closePdfReader();
    }
});

document.addEventListener('keydown', (e) => {
    if (!pdfEls.readerModal.classList.contains('open')) return;
    if (e.key === 'ArrowLeft') goToPage(-1);
    else if (e.key === 'ArrowRight') goToPage(1);
    else if (e.key === 'Escape') closePdfReader();
    else if (e.key === '+' || e.key === '=') zoomPdf(0.25);
    else if (e.key === '-') zoomPdf(-0.25);
});

window.addEventListener('pagehide', saveProgress);

if (pdfEls.readerBody) {
    pdfEls.readerBody.addEventListener('scroll', onReaderScroll);
}
