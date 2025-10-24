// Firebase and Database State
let db = null;
let auth = null;
let unsubscribeListener = null;
let offlineNotified = false;

// Use password from firebase config or fallback to default
const PASSWORD_HASH = window.firestoreAccessPassword || 'notes123';
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
    migrationModal: document.getElementById('migration-modal'),
    migrationCount: document.getElementById('migration-count'),
    migrateYesBtn: document.getElementById('migrate-yes-btn'),
    migrateSkipBtn: document.getElementById('migrate-skip-btn'),
    syncStatus: document.getElementById('sync-status'),
    modalTitle: document.getElementById('modal-title'),
    noteTitle: document.getElementById('note-title'),
    noteContent: document.getElementById('note-content'),
    noteCategory: document.getElementById('note-category'),
    categoriesList: document.getElementById('categories-list'),
    toastContainer: document.getElementById('toast-container')
};

const SYNC_STATUS_META = {
    synced: { icon: '✓', label: 'Synced', className: 'synced' },
    syncing: { icon: '🔄', label: 'Syncing...', className: 'syncing' },
    offline: { icon: '⚠️', label: 'Offline', className: 'offline' },
    error: { icon: '❌', label: 'Error', className: 'error' }
};

function init() {
    setupEventListeners();
    applyTheme();
    setupOnlineOfflineListeners();
    checkAuth();
}

function setupOnlineOfflineListeners() {
    window.addEventListener('online', () => {
        offlineNotified = false;
        updateSyncStatus('syncing');
        showToast('Back online! Syncing notes... 🌐');
    });

    window.addEventListener('offline', () => {
        if (!offlineNotified) {
            updateSyncStatus('offline');
            showToast('You are offline. Changes will sync when reconnected.', 'warning');
            offlineNotified = true;
        }
    });
}

function updateSyncStatus(status = 'synced') {
    const meta = SYNC_STATUS_META[status] || SYNC_STATUS_META.synced;
    elements.syncStatus.className = `sync-status ${meta.className}`;
    elements.syncStatus.querySelector('.sync-icon').textContent = meta.icon;
    elements.syncStatus.querySelector('.sync-label').textContent = meta.label;
    elements.syncStatus.setAttribute('title', meta.label);
}

async function initializeFirebase() {
    if (!window.firebase || !window.firebaseConfig) {
        showToast('Firebase configuration not found. Please set up firebase-config.js', 'error');
        updateSyncStatus('error');
        return false;
    }

    try {
        updateSyncStatus('syncing');
        
        if (!firebase.apps.length) {
            firebase.initializeApp(window.firebaseConfig);
        }

        const firestoreInstance = firebase.firestore();
        auth = firebase.auth();

        // Enable offline persistence
        try {
            await firestoreInstance.enablePersistence({ synchronizeTabs: true });
        } catch (err) {
            if (err.code === 'failed-precondition') {
                console.warn('Multiple tabs open, persistence enabled in one tab only.');
            } else if (err.code === 'unimplemented') {
                console.warn('Browser does not support offline persistence.');
            }
        }

        db = firestoreInstance;

        // Sign in anonymously for backend access
        if (!auth.currentUser) {
            await auth.signInAnonymously();
        }

        return true;
    } catch (error) {
        console.error('Firebase initialization error:', error);
        showToast('Failed to initialize cloud sync: ' + error.message, 'error');
        updateSyncStatus('error');
        return false;
    }
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
    elements.migrateYesBtn.addEventListener('click', handleMigrationYes);
    elements.migrateSkipBtn.addEventListener('click', handleMigrationSkip);

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

async function handleLogin(e) {
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

async function handleLogout() {
    // Unsubscribe from real-time listener
    if (unsubscribeListener) {
        unsubscribeListener();
        unsubscribeListener = null;
    }

    // Sign out from Firebase
    if (auth && auth.currentUser) {
        try {
            await auth.signOut();
        } catch (error) {
            console.error('Sign out error:', error);
        }
    }

    // Clear state
    notes = [];
    categories = new Set();
    localStorage.removeItem('isAuthenticated');
    
    // Close any open modals
    closeNoteModal();
    closeArchivedModal();
    
    showLogin();
    showToast('Logged out successfully');
}

function showLogin() {
    elements.loginScreen.style.display = 'flex';
    elements.app.style.display = 'none';
}

async function showApp() {
    elements.loginScreen.style.display = 'none';
    elements.app.style.display = 'block';
    
    // Initialize Firebase and start sync
    const initialized = await initializeFirebase();
    
    if (initialized) {
        // Check for migration
        await checkForMigration();
        
        // Start listening to Firestore
        startRealtimeSync();
    } else {
        // Show error state
        elements.notesContainer.innerHTML = `
            <div class="empty-state">
                <p class="empty-icon">⚠️</p>
                <h2>Cloud Sync Unavailable</h2>
                <p>Please configure Firebase to enable cloud synchronization.</p>
                <p style="font-size: 14px; color: var(--muted-text-color);">See firebase-config.example.js for instructions.</p>
            </div>
        `;
    }
}

async function checkForMigration() {
    const localNotesJson = localStorage.getItem('notes');
    const migrated = localStorage.getItem('migrated');
    
    if (localNotesJson && !migrated) {
        try {
            const localNotes = JSON.parse(localNotesJson);
            if (localNotes.length > 0) {
                elements.migrationCount.textContent = localNotes.length;
                elements.migrationModal.classList.add('open');
            }
        } catch (error) {
            console.error('Error parsing local notes:', error);
        }
    }
}

async function handleMigrationYes() {
    try {
        const localNotesJson = localStorage.getItem('notes');
        const localNotes = JSON.parse(localNotesJson);
        
        updateSyncStatus('syncing');
        elements.migrationModal.classList.remove('open');
        showToast(`Migrating ${localNotes.length} notes to cloud...`);

        const batch = db.batch();
        
        for (const note of localNotes) {
            const docRef = note && note.id
                ? db.collection('notes').doc(String(note.id))
                : db.collection('notes').doc();

            batch.set(docRef, {
                id: docRef.id,
                title: note?.title || '',
                content: note?.content || '',
                category: note?.category || '',
                tags: Array.isArray(note?.tags) ? note.tags : [],
                createdAt: note?.created ? new Date(note.created) : firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: note?.modified ? new Date(note.modified) : firebase.firestore.FieldValue.serverTimestamp(),
                isPinned: Boolean(note?.pinned),
                isArchived: Boolean(note?.archived)
            }, { merge: true });
        }

        await batch.commit();
        
        localStorage.removeItem('notes');
        localStorage.setItem('migrated', 'true');
        
        showToast('✅ Migration complete! All notes synced to cloud.', 'success');
    } catch (error) {
        console.error('Migration error:', error);
        showToast('Migration failed: ' + error.message, 'error');
        updateSyncStatus('error');
    }
}

function handleMigrationSkip() {
    elements.migrationModal.classList.remove('open');
    showToast('Migration skipped. Local notes preserved.');
}

function startRealtimeSync() {
    if (!db) return;

    if (unsubscribeListener) {
        unsubscribeListener();
        unsubscribeListener = null;
    }

    try {
        unsubscribeListener = db.collection('notes')
            .orderBy('updatedAt', 'desc')
            .onSnapshot((snapshot) => {
                const hasPendingWrites = snapshot.metadata.hasPendingWrites;
                
                notes = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        title: data.title || '',
                        content: data.content || '',
                        category: data.category || '',
                        tags: data.tags || [],
                        createdAt: getDateFromValue(data.createdAt),
                        updatedAt: getDateFromValue(data.updatedAt),
                        isPinned: data.isPinned || false,
                        isArchived: data.isArchived || false
                    };
                });

                updateCategories();
                updateCategoryFilter();
                renderNotes();
                
                // Update sync status based on pending writes and online status
                if (!navigator.onLine) {
                    updateSyncStatus('offline');
                } else if (hasPendingWrites) {
                    updateSyncStatus('syncing');
                } else {
                    updateSyncStatus('synced');
                }
            }, (error) => {
                console.error('Firestore listener error:', error);
                showToast('Sync error: ' + error.message, 'error');
                updateSyncStatus('error');
            });
    } catch (error) {
        console.error('Error starting real-time sync:', error);
        updateSyncStatus('error');
    }
}

function getDateFromValue(value) {
    if (!value) return new Date();
    if (value.toDate) return value.toDate(); // Firestore Timestamp
    if (value instanceof Date) return value;
    return new Date(value);
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

async function saveNote(e) {
    e.preventDefault();

    if (!db) {
        showToast('Cloud sync not available', 'error');
        return;
    }

    const title = elements.noteTitle.value.trim();
    const content = elements.noteContent.value.trim();
    const category = elements.noteCategory.value.trim();

    if (!title || !content) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    try {
        updateSyncStatus('syncing');

        if (currentNote) {
            // Update existing note
            await db.collection('notes').doc(currentNote.id).update({
                title,
                content,
                category,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Note updated successfully! ✅');
        } else {
            // Create new note
            await db.collection('notes').add({
                title,
                content,
                category,
                tags: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                isPinned: false,
                isArchived: false
            });
            showToast('Note created successfully! 🎉');
        }

        closeNoteModal();
    } catch (error) {
        console.error('Save note error:', error);
        showToast('Failed to save note: ' + error.message, 'error');
        updateSyncStatus('error');
    }
}

async function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note?')) {
        return;
    }

    if (!db) {
        showToast('Cloud sync not available', 'error');
        return;
    }

    try {
        updateSyncStatus('syncing');
        await db.collection('notes').doc(noteId).delete();
        showToast('Note deleted 🗑️');
    } catch (error) {
        console.error('Delete note error:', error);
        showToast('Failed to delete note: ' + error.message, 'error');
        updateSyncStatus('error');
    }
}

async function togglePin(noteId) {
    if (!db) return;

    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    try {
        updateSyncStatus('syncing');
        await db.collection('notes').doc(noteId).update({
            isPinned: !note.isPinned,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast(note.isPinned ? 'Note unpinned' : 'Note pinned 📌');
    } catch (error) {
        console.error('Toggle pin error:', error);
        showToast('Failed to update note: ' + error.message, 'error');
        updateSyncStatus('error');
    }
}

async function toggleArchive(noteId) {
    if (!db) return;

    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    try {
        updateSyncStatus('syncing');
        await db.collection('notes').doc(noteId).update({
            isArchived: !note.isArchived,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast(note.isArchived ? 'Note unarchived' : 'Note archived 📦');
        
        // Close archived modal if we're unarchiving from there
        if (note.isArchived) {
            closeArchivedModal();
        }
    } catch (error) {
        console.error('Toggle archive error:', error);
        showToast('Failed to update note: ' + error.message, 'error');
        updateSyncStatus('error');
    }
}

function downloadNote(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const content = `${note.title}\n${'='.repeat(note.title.length)}\n\nCategory: ${note.category || 'None'}\nCreated: ${note.createdAt.toLocaleString()}\nModified: ${note.updatedAt.toLocaleString()}\n\n${note.content}`;

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
        notes: notes.map(note => ({
            ...note,
            createdAt: note.createdAt.toISOString(),
            updatedAt: note.updatedAt.toISOString()
        }))
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
    const archivedNotes = notes.filter(n => n.isArchived);

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
                ${note.updatedAt.toLocaleDateString()}
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
        if (n.isArchived) return false;

        const matchesSearch = !searchQuery ||
            n.title.toLowerCase().includes(searchQuery) ||
            n.content.toLowerCase().includes(searchQuery) ||
            (n.category && n.category.toLowerCase().includes(searchQuery));

        const matchesCategory = !categoryFilter || n.category === categoryFilter;

        return matchesSearch && matchesCategory;
    });

    filteredNotes.sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
            return b.isPinned ? 1 : -1;
        }

        switch (sortBy) {
            case 'created':
                return b.createdAt - a.createdAt;
            case 'title':
                return a.title.localeCompare(b.title);
            case 'modified':
            default:
                return b.updatedAt - a.updatedAt;
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

        card.innerHTML = `
            <div class="note-header">
                <h2 class="note-title">${note.isPinned ? '📌 ' : ''}${escapeHtml(note.title)}</h2>
            </div>
            <div class="note-meta">
                <span>Created: ${note.createdAt.toLocaleDateString()}</span>
                ${note.createdAt.getTime() !== note.updatedAt.getTime() ? `<span>• Modified: ${note.updatedAt.toLocaleDateString()}</span>` : ''}
            </div>
            ${note.category ? `<div class="note-tags"><span class="note-tag">${escapeHtml(note.category)}</span></div>` : ''}
            <div class="note-content">${escapeHtml(note.content)}</div>
            <div class="note-actions">
                <button onclick="openEditNoteModal('${note.id}')">✏️ Edit</button>
                <button onclick="togglePin('${note.id}')">${note.isPinned ? '📌 Unpin' : '📍 Pin'}</button>
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

// Make functions available globally for inline event handlers
window.openEditNoteModal = openEditNoteModal;
window.deleteNote = deleteNote;
window.togglePin = togglePin;
window.toggleArchive = toggleArchive;
window.downloadNote = downloadNote;

init();
