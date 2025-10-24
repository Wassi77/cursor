const PASSWORD_HASH = 'notes123';
let currentNote = null;
let notes = [];
let categories = new Set();

const elements = {
    loginScreen: document.getElementById('login-screen'),
    loginForm: document.getElementById('login-form'),
    passwordInput: document.getElementById('password-input'),
    app: document.getElementById('app'),
    logoutBtn: document.getElementById('logout-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    newNoteBtn: document.getElementById('new-note-btn'),
    noteModal: document.getElementById('note-modal'),
    noteForm: document.getElementById('note-form'),
    closeModal: document.getElementById('close-modal'),
    cancelNoteBtn: document.getElementById('cancel-note-btn'),
    notesContainer: document.getElementById('notes-container'),
    searchInput: document.getElementById('search-input'),
    categoryFilter: document.getElementById('category-filter'),
    sortSelect: document.getElementById('sort-select'),
    exportAllBtn: document.getElementById('export-all-btn'),
    showArchivedBtn: document.getElementById('show-archived-btn'),
    archivedModal: document.getElementById('archived-modal'),
    closeArchivedModal: document.getElementById('close-archived-modal'),
    archivedNotesContainer: document.getElementById('archived-notes-container'),
    modalTitle: document.getElementById('modal-title'),
    noteTitle: document.getElementById('note-title'),
    noteContent: document.getElementById('note-content'),
    noteCategory: document.getElementById('note-category'),
    categoriesList: document.getElementById('categories-list'),
    toastContainer: document.getElementById('toast-container')
};

function init() {
    loadNotes();
    checkAuth();
    setupEventListeners();
    applyTheme();
}

function setupEventListeners() {
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.logoutBtn.addEventListener('click', handleLogout);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.newNoteBtn.addEventListener('click', openNewNoteModal);
    elements.closeModal.addEventListener('click', closeNoteModal);
    elements.cancelNoteBtn.addEventListener('click', closeNoteModal);
    elements.noteForm.addEventListener('submit', saveNote);
    elements.searchInput.addEventListener('input', renderNotes);
    elements.categoryFilter.addEventListener('change', renderNotes);
    elements.sortSelect.addEventListener('change', renderNotes);
    elements.exportAllBtn.addEventListener('click', exportAllNotes);
    elements.showArchivedBtn.addEventListener('click', showArchivedNotes);
    elements.closeArchivedModal.addEventListener('click', closeArchivedModal);

    elements.noteModal.addEventListener('click', (e) => {
        if (e.target === elements.noteModal) {
            closeNoteModal();
        }
    });

    elements.archivedModal.addEventListener('click', (e) => {
        if (e.target === elements.archivedModal) {
            closeArchivedModal();
        }
    });
}

function checkAuth() {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (isAuthenticated === 'true') {
        showApp();
    } else {
        showLogin();
    }
}

function handleLogin(e) {
    e.preventDefault();
    const password = elements.passwordInput.value;

    if (password === PASSWORD_HASH) {
        localStorage.setItem('isAuthenticated', 'true');
        showApp();
        showToast('Welcome back! 👋');
    } else {
        showToast('Incorrect password. Please try again.', 'error');
        elements.passwordInput.value = '';
        elements.passwordInput.focus();
    }
}

function handleLogout() {
    localStorage.removeItem('isAuthenticated');
    showLogin();
    showToast('Logged out successfully');
}

function showLogin() {
    elements.loginScreen.style.display = 'flex';
    elements.app.style.display = 'none';
}

function showApp() {
    elements.loginScreen.style.display = 'none';
    elements.app.style.display = 'block';
    renderNotes();
    updateCategoryFilter();
}

function loadNotes() {
    const storedNotes = localStorage.getItem('notes');
    notes = storedNotes ? JSON.parse(storedNotes) : [];
    updateCategories();
}

function saveNotesToStorage() {
    localStorage.setItem('notes', JSON.stringify(notes));
}

function updateCategories() {
    categories = new Set(notes.filter(n => n.category).map(n => n.category));
    updateCategoryDatalist();
}

function updateCategoryDatalist() {
    elements.categoriesList.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        elements.categoriesList.appendChild(option);
    });
}

function updateCategoryFilter() {
    const currentValue = elements.categoryFilter.value;
    elements.categoryFilter.innerHTML = '<option value="">All Categories</option>';

    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        elements.categoryFilter.appendChild(option);
    });

    if (currentValue && categories.has(currentValue)) {
        elements.categoryFilter.value = currentValue;
    }
}

function openNewNoteModal() {
    currentNote = null;
    elements.modalTitle.textContent = 'New Note';
    elements.noteTitle.value = '';
    elements.noteContent.value = '';
    elements.noteCategory.value = '';
    elements.noteModal.classList.add('open');
    elements.noteTitle.focus();
}

function openEditNoteModal(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    currentNote = note;
    elements.modalTitle.textContent = 'Edit Note';
    elements.noteTitle.value = note.title;
    elements.noteContent.value = note.content;
    elements.noteCategory.value = note.category || '';
    elements.noteModal.classList.add('open');
    elements.noteTitle.focus();
}

function closeNoteModal() {
    elements.noteModal.classList.remove('open');
    currentNote = null;
}

function closeArchivedModal() {
    elements.archivedModal.classList.remove('open');
}

function saveNote(e) {
    e.preventDefault();

    const title = elements.noteTitle.value.trim();
    const content = elements.noteContent.value.trim();
    const category = elements.noteCategory.value.trim();

    if (!title || !content) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    if (currentNote) {
        currentNote.title = title;
        currentNote.content = content;
        currentNote.category = category;
        currentNote.modified = new Date().toISOString();
        showToast('Note updated successfully! ✅');
    } else {
        const newNote = {
            id: Date.now().toString(),
            title,
            content,
            category,
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            pinned: false,
            archived: false
        };
        notes.push(newNote);
        showToast('Note created successfully! 🎉');
    }

    saveNotesToStorage();
    updateCategories();
    updateCategoryFilter();
    renderNotes();
    closeNoteModal();
}

function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note?')) {
        return;
    }

    notes = notes.filter(n => n.id !== noteId);
    saveNotesToStorage();
    updateCategories();
    updateCategoryFilter();
    renderNotes();
    showToast('Note deleted 🗑️');
}

function togglePin(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (note) {
        note.pinned = !note.pinned;
        saveNotesToStorage();
        renderNotes();
        showToast(note.pinned ? 'Note pinned 📌' : 'Note unpinned');
    }
}

function toggleArchive(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (note) {
        note.archived = !note.archived;
        saveNotesToStorage();
        renderNotes();
        showToast(note.archived ? 'Note archived 📦' : 'Note unarchived');
    }
}

function downloadNote(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const content = `${note.title}\n${'='.repeat(note.title.length)}\n\nCategory: ${note.category || 'None'}\nCreated: ${new Date(note.created).toLocaleString()}\nModified: ${new Date(note.modified).toLocaleString()}\n\n${note.content}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Note downloaded 💾');
}

function exportAllNotes() {
    if (notes.length === 0) {
        showToast('No notes to export', 'error');
        return;
    }

    const exportData = {
        exportDate: new Date().toISOString(),
        notesCount: notes.length,
        notes: notes
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('All notes exported! 💾');
}

function showArchivedNotes() {
    const archivedNotes = notes.filter(n => n.archived);

    if (archivedNotes.length === 0) {
        showToast('No archived notes');
        return;
    }

    elements.archivedNotesContainer.innerHTML = '';

    archivedNotes.forEach(note => {
        const card = document.createElement('div');
        card.className = 'archived-note-card';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <h3 style="margin: 0;">${escapeHtml(note.title)}</h3>
            </div>
            <div style="color: var(--muted-text-color); font-size: 14px; margin-bottom: 8px;">
                ${new Date(note.modified).toLocaleDateString()}
            </div>
            <div style="margin-bottom: 12px;">
                ${note.category ? `<span class="note-tag">${escapeHtml(note.category)}</span>` : ''}
            </div>
            <div style="color: var(--muted-text-color); margin-bottom: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${escapeHtml(note.content.substring(0, 100))}...
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="toggleArchive('${note.id}')" style="padding: 8px 12px; border-radius: 9px; border: none; cursor: pointer; background: rgba(58, 134, 255, 0.1); color: var(--primary-color); font-weight: 600;">
                    📤 Unarchive
                </button>
                <button onclick="deleteNote('${note.id}')" style="padding: 8px 12px; border-radius: 9px; border: none; cursor: pointer; background: rgba(239, 68, 68, 0.1); color: #ef4444; font-weight: 600;">
                    🗑️ Delete
                </button>
            </div>
        `;
        elements.archivedNotesContainer.appendChild(card);
    });

    elements.archivedModal.classList.add('open');
}

function renderNotes() {
    const searchQuery = elements.searchInput.value.toLowerCase();
    const categoryFilter = elements.categoryFilter.value;
    const sortBy = elements.sortSelect.value;

    let filteredNotes = notes.filter(n => {
        if (n.archived) return false;

        const matchesSearch = !searchQuery ||
            n.title.toLowerCase().includes(searchQuery) ||
            n.content.toLowerCase().includes(searchQuery) ||
            (n.category && n.category.toLowerCase().includes(searchQuery));

        const matchesCategory = !categoryFilter || n.category === categoryFilter;

        return matchesSearch && matchesCategory;
    });

    filteredNotes.sort((a, b) => {
        if (a.pinned !== b.pinned) {
            return b.pinned ? 1 : -1;
        }

        switch (sortBy) {
            case 'created':
                return new Date(b.created) - new Date(a.created);
            case 'title':
                return a.title.localeCompare(b.title);
            case 'modified':
            default:
                return new Date(b.modified) - new Date(a.modified);
        }
    });

    if (filteredNotes.length === 0) {
        elements.notesContainer.innerHTML = `
            <div class="empty-state">
                <p class="empty-icon">🔍</p>
                <h2>No notes found</h2>
                <p>${searchQuery || categoryFilter ? 'Try adjusting your filters' : 'Create your first note to get started!'}</p>
            </div>
        `;
        return;
    }

    elements.notesContainer.innerHTML = '';

    filteredNotes.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card';

        const created = new Date(note.created);
        const modified = new Date(note.modified);

        card.innerHTML = `
            <div class="note-header">
                <h2 class="note-title">${note.pinned ? '📌 ' : ''}${escapeHtml(note.title)}</h2>
            </div>
            <div class="note-meta">
                <span>Created: ${created.toLocaleDateString()}</span>
                ${note.created !== note.modified ? `<span>• Modified: ${modified.toLocaleDateString()}</span>` : ''}
            </div>
            ${note.category ? `<div class="note-tags"><span class="note-tag">${escapeHtml(note.category)}</span></div>` : ''}
            <div class="note-content">${escapeHtml(note.content)}</div>
            <div class="note-actions">
                <button onclick="openEditNoteModal('${note.id}')">✏️ Edit</button>
                <button onclick="togglePin('${note.id}')">${note.pinned ? '📌 Unpin' : '📍 Pin'}</button>
                <button onclick="toggleArchive('${note.id}')">📦 Archive</button>
                <button onclick="downloadNote('${note.id}')">💾 Download</button>
                <button onclick="deleteNote('${note.id}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">🗑️ Delete</button>
            </div>
        `;

        elements.notesContainer.appendChild(card);
    });
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    elements.themeToggle.querySelector('.icon').textContent = isDark ? '☀️' : '🌙';
}

function applyTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark');
        elements.themeToggle.querySelector('.icon').textContent = '☀️';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

init();
