// Firebase and Database State
let db = null;
let auth = null;
let unsubscribeListener = null;
let offlineNotified = false;
let firebaseConfigAvailable = false;

// Use password from firebase config or fallback to default
const PASSWORD_HASH = window.firestoreAccessPassword || 'notes123';
let currentNote = null;
let notes = [];
let categories = new Set();
const expandedNoteIds = new Set();

const SUPPORTED_IMAGE_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp'
]);
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE = MAX_IMAGE_SIZE_MB * 1024 * 1024;
let editorStatusTimeoutId = null;
const inlineEditorStatusTimers = new WeakMap();

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
    noteContentEditor: document.getElementById('note-content-editor'),
    noteCategory: document.getElementById('note-category'),
    categoriesList: document.getElementById('categories-list'),
    toastContainer: document.getElementById('toast-container'),
    uploadImageBtn: document.getElementById('upload-image-btn'),
    imageUploadInput: document.getElementById('image-upload-input'),
    noteEditorStatus: document.getElementById('note-editor-status'),
    autoSaveStatus: document.getElementById('auto-save-status')
};

const SYNC_STATUS_META = {
    synced: { icon: '✓', label: 'Synced', className: 'synced' },
    syncing: { icon: '🔄', label: 'Syncing...', className: 'syncing' },
    offline: { icon: '⚠️', label: 'Offline', className: 'offline' },
    error: { icon: '❌', label: 'Error', className: 'error' }
};

// Auto-save state management
let autoSaveTimeout = null;
let modalAutoSaveNoteId = null;
const inlineAutoSaveTimers = new WeakMap();
const AUTO_SAVE_DELAY = 1500; // 1.5 seconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        return timeout;
    };
}

// Update auto-save status indicator
function updateAutoSaveStatus(statusElement, state, message = '') {
    if (!statusElement) return;
    
    statusElement.className = statusElement.className.replace(/\b(idle|saving|saved|error)\b/g, '');
    statusElement.classList.add(state);
    
    const icon = statusElement.querySelector('.status-icon') || document.createElement('span');
    icon.className = 'status-icon';
    
    const label = statusElement.querySelector('.status-label') || document.createElement('span');
    label.className = 'status-label';
    
    switch (state) {
        case 'idle':
            statusElement.innerHTML = '';
            break;
        case 'saving':
            icon.textContent = '🔄';
            label.textContent = message || 'Saving...';
            statusElement.innerHTML = '';
            statusElement.appendChild(icon);
            statusElement.appendChild(label);
            break;
        case 'saved':
            icon.textContent = '✓';
            label.textContent = message || 'All changes saved';
            statusElement.innerHTML = '';
            statusElement.appendChild(icon);
            statusElement.appendChild(label);
            // Auto-hide after 3 seconds
            setTimeout(() => {
                if (statusElement.classList.contains('saved')) {
                    updateAutoSaveStatus(statusElement, 'idle');
                }
            }, 3000);
            break;
        case 'error':
            icon.textContent = '⚠️';
            label.textContent = message || 'Save failed';
            statusElement.innerHTML = '';
            statusElement.appendChild(icon);
            statusElement.appendChild(label);
            break;
    }
}

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
     if (!window.firebase) {
         console.error('Firebase SDK not loaded. Check that Firebase scripts are properly included.');
         updateSyncStatus('error');
         return false;
     }

     if (!window.firebaseConfig) {
         console.error('Firebase configuration not found. Please set up firebase-config.js');
         updateSyncStatus('error');
         return false;
     }

     if (!window.firebaseConfig.apiKey || !window.firebaseConfig.projectId) {
         console.error('Firebase configuration is incomplete. Missing required fields.');
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

         console.log('Firebase initialized successfully with project:', window.firebaseConfig.projectId);
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
     elements.searchInput.addEventListener('input', renderNotes);
     elements.categoryFilter.addEventListener('change', renderNotes);
     elements.sortSelect.addEventListener('change', renderNotes);
     elements.exportAllBtn.addEventListener('click', exportAllNotes);
     elements.showArchivedBtn.addEventListener('click', showArchivedNotes);
     elements.closeArchivedModal.addEventListener('click', closeArchivedModal);
     elements.migrateYesBtn.addEventListener('click', handleMigrationYes);
     elements.migrateSkipBtn.addEventListener('click', handleMigrationSkip);

     // Setup modal event listeners
     const setupModal = document.getElementById('setup-modal');
     const checkConfigBtn = document.getElementById('check-config-btn');
     const useOfflineBtn = document.getElementById('use-offline-btn');

     if (checkConfigBtn) {
         checkConfigBtn.addEventListener('click', () => {
             location.reload();
         });
     }

     if (useOfflineBtn) {
         useOfflineBtn.addEventListener('click', () => {
             if (setupModal) {
                 setupModal.classList.remove('open');
             }
             showToast('Cloud sync is disabled. Your notes are stored locally only.', 'info');
         });
     }

    if (elements.uploadImageBtn && elements.imageUploadInput) {
        elements.uploadImageBtn.addEventListener('click', () => {
            elements.imageUploadInput.click();
        });

        elements.imageUploadInput.addEventListener('change', handleImageUpload);
    }

    if (elements.noteContentEditor) {
        elements.noteContentEditor.addEventListener('paste', handleEditorPaste);
    }

    // Setup auto-save for modal editor
    setupModalAutoSave();

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
     // Check if Firebase config is available
     firebaseConfigAvailable = !window.firebaseConfigNotFound && window.firebaseConfig && window.firebaseConfig.apiKey;

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

      // Check if Firebase config is available
      if (!firebaseConfigAvailable) {
          const setupModal = document.getElementById('setup-modal');
          if (setupModal) {
              setupModal.classList.add('open');
          }
          // Load notes from localStorage for offline-only mode
          loadLocalNotes();
          return;
      }

      // Initialize Firebase and start sync
      const initialized = await initializeFirebase();

      if (initialized) {
          // Check for migration
          await checkForMigration();

          // Start listening to Firestore
          startRealtimeSync();
      } else {
          // Fall back to local storage if Firebase fails
          console.warn('Firebase initialization failed, falling back to local storage');
          loadLocalNotes();
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

function loadLocalNotes() {
     const localNotesJson = localStorage.getItem('notes');
     if (localNotesJson) {
         try {
             notes = JSON.parse(localNotesJson);
             updateCategories();
             updateCategoryFilter();
             renderNotes();
             updateSyncStatus('offline');
         } catch (error) {
             console.error('Error loading local notes:', error);
             notes = [];
             renderNotes();
         }
     } else {
         notes = [];
         renderNotes();
     }
}

function saveNoteToLocalStorage(title, content, category) {
     const now = new Date();
     const note = modalAutoSaveNoteId ? 
         notes.find(n => n.id === modalAutoSaveNoteId) :
         currentNote;
     
     if (note) {
         // Update existing note
         note.title = title;
         note.content = content;
         note.category = category;
         note.updatedAt = now;
         note.plainContent = extractPlainTextFromHtml(content);
     } else {
         // Create new note
         const newNote = {
             id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
             title,
             content,
             plainContent: extractPlainTextFromHtml(content),
             category,
             tags: [],
             createdAt: now,
             updatedAt: now,
             isPinned: false,
             isArchived: false
         };
         notes.unshift(newNote);
         modalAutoSaveNoteId = newNote.id;
         
         if (elements.modalTitle) {
             elements.modalTitle.textContent = 'Edit Note';
         }
     }
     
     // Save to localStorage
     try {
         localStorage.setItem('notes', JSON.stringify(notes));
         updateCategories();
         updateCategoryFilter();
         renderNotes();
     } catch (error) {
         console.error('Error saving note to localStorage:', error);
     }
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
                
                const newNoteIds = new Set();
                notes = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const normalizedContent = normalizeNoteContent(data.content || '');
                    const note = {
                        id: doc.id,
                        title: data.title || '',
                        content: normalizedContent,
                        plainContent: extractPlainTextFromHtml(normalizedContent),
                        category: data.category || '',
                        tags: data.tags || [],
                        createdAt: getDateFromValue(data.createdAt),
                        updatedAt: getDateFromValue(data.updatedAt),
                        isPinned: data.isPinned || false,
                        isArchived: data.isArchived || false
                    };

                    newNoteIds.add(doc.id);
                    return note;
                });

                for (const id of Array.from(expandedNoteIds)) {
                    if (!newNoteIds.has(id)) {
                        expandedNoteIds.delete(id);
                    }
                }

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

// Setup auto-save for modal editor
function setupModalAutoSave() {
    const triggerAutoSave = debounce(() => {
        if (elements.noteModal.classList.contains('open')) {
            autoSaveModalNote();
        }
    }, AUTO_SAVE_DELAY);

    if (elements.noteTitle) {
        elements.noteTitle.addEventListener('input', triggerAutoSave);
    }

    if (elements.noteContentEditor) {
        elements.noteContentEditor.addEventListener('input', triggerAutoSave);
    }

    if (elements.noteCategory) {
        elements.noteCategory.addEventListener('input', triggerAutoSave);
    }
}

// Auto-save modal note with retry logic
async function autoSaveModalNote(retryCount = 0) {
     const title = elements.noteTitle.value.trim();
     const category = elements.noteCategory.value.trim();
     const editorHtml = elements.noteContentEditor ? elements.noteContentEditor.innerHTML : '';
     const sanitizedContent = sanitizeNoteContent(editorHtml);
     const contentHasValue = hasMeaningfulContent(sanitizedContent);

     // Don't auto-save if title is empty or content has no value
     if (!title || !contentHasValue) {
         return;
     }

     if (elements.noteContentEditor) {
         elements.noteContentEditor.innerHTML = sanitizedContent;
     }

     try {
         updateAutoSaveStatus(elements.autoSaveStatus, 'saving');
         updateSyncStatus('syncing');

         // If Firebase is available, use it; otherwise fall back to local storage
         if (db && firebaseConfigAvailable) {
             if (modalAutoSaveNoteId || currentNote) {
                 // Update existing note
                 const noteId = modalAutoSaveNoteId || currentNote.id;
                 await db.collection('notes').doc(noteId).update({
                     title,
                     content: sanitizedContent,
                     category,
                     updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                 });
             } else {
                 // Create new note
                 const docRef = await db.collection('notes').add({
                     title,
                     content: sanitizedContent,
                     category,
                     tags: [],
                     createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                     updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                     isPinned: false,
                     isArchived: false
                 });
                 // Store the note ID for subsequent auto-saves
                 modalAutoSaveNoteId = docRef.id;
                 // Update modal title to indicate editing
                 elements.modalTitle.textContent = 'Edit Note';
             }
         } else {
             // Use local storage fallback
             saveNoteToLocalStorage(title, sanitizedContent, category);
         }

         updateAutoSaveStatus(elements.autoSaveStatus, 'saved');
     } catch (error) {
         console.error('Auto-save error:', error);

         // Retry logic with exponential backoff
         if (retryCount < MAX_RETRY_ATTEMPTS) {
             const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
             updateAutoSaveStatus(elements.autoSaveStatus, 'error', `Retrying in ${delay / 1000}s...`);

             setTimeout(() => {
                 autoSaveModalNote(retryCount + 1);
             }, delay);
         } else {
             updateAutoSaveStatus(elements.autoSaveStatus, 'error', 'Save failed. Check connection.');
             updateSyncStatus('error');
         }
     }
}

function openNewNoteModal() {
    currentNote = null;
    modalAutoSaveNoteId = null; // Reset auto-save note ID
    elements.modalTitle.textContent = 'New Note';
    elements.noteTitle.value = '';
    if (elements.noteContentEditor) {
        elements.noteContentEditor.innerHTML = '';
    }
    elements.noteCategory.value = '';
    clearEditorStatus();
    updateAutoSaveStatus(elements.autoSaveStatus, 'idle');
    elements.noteModal.classList.add('open');
    elements.noteTitle.focus();
}

function openEditNoteModal(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    currentNote = note;
    modalAutoSaveNoteId = note.id; // Set for auto-save
    elements.modalTitle.textContent = 'Edit Note';
    elements.noteTitle.value = note.title;
    if (elements.noteContentEditor) {
        elements.noteContentEditor.innerHTML = note.content || '';
        focusEditorAtEnd(elements.noteContentEditor);
    }
    elements.noteCategory.value = note.category || '';
    clearEditorStatus();
    updateAutoSaveStatus(elements.autoSaveStatus, 'idle');
    elements.noteModal.classList.add('open');
    elements.noteTitle.focus();
}

function closeNoteModal() {
    elements.noteModal.classList.remove('open');
    currentNote = null;
    modalAutoSaveNoteId = null;
    clearEditorStatus();
    updateAutoSaveStatus(elements.autoSaveStatus, 'idle');
}

function closeArchivedModal() {
    elements.archivedModal.classList.remove('open');
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

    const noteBodyText = note.plainContent || extractPlainTextFromHtml(note.content);
    const content = `${note.title}\n${'='.repeat(note.title.length)}\n\nCategory: ${note.category || 'None'}\nCreated: ${note.createdAt.toLocaleString()}\nModified: ${note.updatedAt.toLocaleString()}\n\n${noteBodyText}`;

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
                ${escapeHtml((note.plainContent || extractPlainTextFromHtml(note.content)).substring(0, 100))}...
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

    const activeNoteIds = new Set(notes.filter(n => !n.isArchived).map(n => n.id));
    for (const id of Array.from(expandedNoteIds)) {
        if (!activeNoteIds.has(id)) {
            expandedNoteIds.delete(id);
        }
    }

    let filteredNotes = notes.filter(n => {
        if (n.isArchived) return false;

        const matchesSearch = !searchQuery ||
            n.title.toLowerCase().includes(searchQuery) ||
            (n.plainContent || '').toLowerCase().includes(searchQuery) ||
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
        const isExpanded = expandedNoteIds.has(note.id);
        const card = document.createElement('div');
        const noteBodyId = `note-body-${note.id}`;
        const rawTitle = note.title || 'Untitled note';
        const safeTitle = escapeHtml(rawTitle);
        const toggleLabel = escapeHtml(`Toggle details for ${rawTitle}`);
        const toggleTitle = isExpanded ? 'Collapse note' : 'Expand note';
        const titleWithPin = note.isPinned ? `📌 ${safeTitle}` : safeTitle;

        const metaItems = [
            `<span class="note-meta-item"><span class="note-meta-label">Created:</span> <span class="note-meta-value">${note.createdAt.toLocaleDateString()}</span></span>`
        ];
        if (note.createdAt.getTime() !== note.updatedAt.getTime()) {
            metaItems.push(`<span class="note-meta-item"><span class="note-meta-label">Modified:</span> <span class="note-meta-value">${note.updatedAt.toLocaleDateString()}</span></span>`);
        }
        const metaHtml = `<div class="note-meta">${metaItems.join('')}</div>`;

        const tagChips = [];
        if (note.category) {
            tagChips.push(`<span class="note-tag note-tag--category">${escapeHtml(note.category)}</span>`);
        }
        if (Array.isArray(note.tags)) {
            note.tags.filter(Boolean).forEach(tag => {
                tagChips.push(`<span class="note-tag">${escapeHtml(tag)}</span>`);
            });
        }
        const tagsHtml = tagChips.length ? `<div class="note-tags">${tagChips.join('')}</div>` : '';

        const noteContent = note.content || '';
        const safeCategoryValue = escapeHtml(note.category || '');

        card.className = `note-card ${isExpanded ? 'expanded' : 'collapsed'}`;
        card.dataset.noteId = note.id;

        card.innerHTML = `
            <div class="note-header">
                <button class="note-toggle" type="button" title="${toggleTitle}" aria-expanded="${isExpanded ? 'true' : 'false'}" aria-controls="${noteBodyId}" aria-label="${toggleLabel}">
                    <span class="note-toggle-icon" aria-hidden="true"></span>
                </button>
                <div class="note-title-group">
                    <h2 class="note-title">${titleWithPin}</h2>
                    <input class="inline-title-input" type="text" value="${safeTitle}" placeholder="Note title" aria-label="Edit note title" autocomplete="off">
                </div>
            </div>
            <div id="${noteBodyId}" class="note-body">
                ${metaHtml}
                ${tagsHtml}
                <div class="inline-field-row inline-category-field">
                    <label class="inline-field-label" for="inline-category-${note.id}">Category</label>
                    <input id="inline-category-${note.id}" class="inline-category-input" type="text" value="${safeCategoryValue}" placeholder="Add a category" list="categories-list" autocomplete="off" aria-label="Edit note category">
                </div>
                <div class="note-content-wrapper">
                    <div class="note-editor-toolbar inline-editor-toolbar" style="display: none;">
                        <button type="button" class="btn btn-secondary note-editor-upload-btn inline-upload-btn" data-note-id="${note.id}">
                            🖼️ Upload Image
                        </button>
                        <input type="file" class="inline-image-upload-input" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp" multiple hidden>
                        <span class="note-editor-hint">Tip: Paste images with Ctrl+V or Cmd+V</span>
                        <span class="inline-editor-status note-editor-status" aria-live="polite"></span>
                        <span class="inline-auto-save-status auto-save-status idle" aria-live="polite"></span>
                    </div>
                    <div class="note-content inline-note-editor" contenteditable="${isExpanded ? 'true' : 'false'}" data-placeholder="Write your note here..."></div>
                </div>
                <div class="note-actions">
                    <button class="inline-save-btn" data-note-id="${note.id}" style="display: none; background: rgba(34, 197, 94, 0.1); color: #22c55e;">💾 Save</button>
                    <button onclick="togglePin('${note.id}')">${note.isPinned ? '📌 Unpin' : '📍 Pin'}</button>
                    <button onclick="toggleArchive('${note.id}')">📦 Archive</button>
                    <button onclick="downloadNote('${note.id}')">💾 Download</button>
                    <button onclick="deleteNote('${note.id}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">🗑️ Delete</button>
                </div>
            </div>
        `;

        const contentDiv = card.querySelector('.note-content');
        if (contentDiv) {
            contentDiv.innerHTML = noteContent;
        }

        setupInlineEditor(card, note, isExpanded);

        const noteBody = card.querySelector('.note-body');
        const toggleBtn = card.querySelector('.note-toggle');

        if (isExpanded && noteBody) {
            requestAnimationFrame(() => {
                noteBody.style.maxHeight = 'none';
            });
        }

        if (toggleBtn) {
            toggleBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleCardExpansion(card, note.id);
            });
        }

        elements.notesContainer.appendChild(card);
    });
}

function toggleCardExpansion(card, noteId) {
    const body = card.querySelector('.note-body');
    const toggleBtn = card.querySelector('.note-toggle');
    const note = notes.find(n => n.id === noteId);
    if (!body || !toggleBtn || !note) return;

    const shouldExpand = !card.classList.contains('expanded');

    if (shouldExpand) {
        expandedNoteIds.add(noteId);
        card.classList.add('expanded');
        card.classList.remove('collapsed');
        toggleBtn.setAttribute('aria-expanded', 'true');
        toggleBtn.setAttribute('title', 'Collapse note');
        setInlineEditMode(card, note, true, { focus: true });

        const targetHeight = body.scrollHeight;
        body.style.maxHeight = '0px';
        requestAnimationFrame(() => {
            body.style.maxHeight = `${targetHeight}px`;
        });

        const onExpandTransitionEnd = (event) => {
            if (event.propertyName !== 'max-height') return;
            body.style.maxHeight = 'none';
            body.removeEventListener('transitionend', onExpandTransitionEnd);
        };

        body.addEventListener('transitionend', onExpandTransitionEnd);
    } else {
        expandedNoteIds.delete(noteId);
        card.classList.remove('expanded');
        card.classList.add('collapsed');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('title', 'Expand note');
        setInlineEditMode(card, note, false);

        const currentHeight = body.scrollHeight;
        body.style.maxHeight = `${currentHeight}px`;
        requestAnimationFrame(() => {
            body.style.maxHeight = '0px';
        });

        const onCollapseTransitionEnd = (event) => {
            if (event.propertyName !== 'max-height') return;
            body.style.maxHeight = '';
            body.removeEventListener('transitionend', onCollapseTransitionEnd);
        };

        body.addEventListener('transitionend', onCollapseTransitionEnd);
    }
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

async function handleImageUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
        return;
    }

    for (const file of files) {
        if (!validateImageFile(file)) {
            continue;
        }
        await processImage(file);
    }

    event.target.value = '';
}

function handleEditorPaste(event) {
    if (!elements.noteContentEditor) return;

    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const items = clipboardData.items ? Array.from(clipboardData.items) : [];
    const imageItem = items.find((item) => item.type && item.type.startsWith('image/'));

    if (imageItem) {
        event.preventDefault();
        const file = imageItem.getAsFile();
        if (file && validateImageFile(file)) {
            processImage(file);
        }
        return;
    }

    const text = clipboardData.getData('text/plain');
    if (typeof text === 'string' && text.length > 0) {
        event.preventDefault();
        insertTextAtCursor(text);
    }
}

function validateImageFile(file) {
    const fileType = (file.type || '').toLowerCase();
    const extension = ((file.name || '').split('.').pop() || '').toLowerCase();

    const isTypeValid = fileType && SUPPORTED_IMAGE_TYPES.has(fileType);
    const isExtensionValid = SUPPORTED_IMAGE_EXTENSIONS.has(extension);

    if (!isTypeValid && !isExtensionValid) {
        const readable = extension ? extension.toUpperCase() : 'UNKNOWN';
        showEditorStatus(`Unsupported format (${readable}). Use PNG, JPEG, GIF, or WebP.`, 'error', 5000);
        showToast('Unsupported image format', 'error');
        return false;
    }

    if (file.size > MAX_IMAGE_SIZE) {
        showEditorStatus(`Image too large (${formatFileSize(file.size)}). Max ${MAX_IMAGE_SIZE_MB}MB.`, 'error', 5000);
        showToast(`Image too large (max ${MAX_IMAGE_SIZE_MB}MB)`, 'error');
        return false;
    }

    return true;
}

async function processImage(file) {
    try {
        setEditorProcessing(true);
        showEditorStatus('Adding image...', 'info');

        const dataUrl = await readFileAsDataURL(file);
        insertImageIntoEditor(dataUrl, file.name);

        showToast('Image added to note 🖼️');
        showEditorStatus(`Image added (${formatFileSize(file.size)})`, 'success', 3200);
    } catch (error) {
        console.error('Image processing error:', error);
        showEditorStatus('Failed to add image', 'error', 4000);
        showToast('Failed to add image', 'error');
    } finally {
        setEditorProcessing(false);
    }
}

function setEditorProcessing(isProcessing) {
    if (!elements.uploadImageBtn) return;

    if (isProcessing) {
        elements.uploadImageBtn.classList.add('is-loading');
        elements.uploadImageBtn.setAttribute('aria-busy', 'true');
        elements.uploadImageBtn.disabled = true;
    } else {
        elements.uploadImageBtn.classList.remove('is-loading');
        elements.uploadImageBtn.removeAttribute('aria-busy');
        elements.uploadImageBtn.disabled = false;
    }
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Invalid file result'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

function insertImageIntoEditor(dataUrl, fileName = '') {
    if (!elements.noteContentEditor) return;

    const img = document.createElement('img');
    img.src = dataUrl;
    const trimmedName = (fileName || '').trim();
    if (trimmedName) {
        const altText = trimmedName.replace(/\.[^/.]+$/, '');
        img.alt = altText || 'Note image';
        img.title = trimmedName;
    } else {
        img.alt = 'Note image';
    }
    img.loading = 'lazy';

    const selection = window.getSelection();
    let range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    if (!range || !elements.noteContentEditor.contains(range.commonAncestorContainer)) {
        range = document.createRange();
        range.selectNodeContents(elements.noteContentEditor);
        range.collapse(false);
    }

    range.deleteContents();
    range.insertNode(img);

    const spacer = document.createElement('br');
    img.insertAdjacentElement('afterend', spacer);

    range.setStartAfter(spacer);
    range.collapse(true);

    if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
    }

    elements.noteContentEditor.focus();
}

function insertTextAtCursor(text) {
    if (!elements.noteContentEditor) return;

    const normalizedText = text.replace(/\r\n/g, '\n');
    const lines = normalizedText.split('\n');

    const selection = window.getSelection();
    let range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    if (!range || !elements.noteContentEditor.contains(range.commonAncestorContainer)) {
        range = document.createRange();
        range.selectNodeContents(elements.noteContentEditor);
        range.collapse(false);
    }

    range.deleteContents();

    lines.forEach((line, index) => {
        if (line.length) {
            const textNode = document.createTextNode(line);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
        }
        if (index < lines.length - 1) {
            const br = document.createElement('br');
            range.insertNode(br);
            range.setStartAfter(br);
        }
    });

    range.collapse(true);

    if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
    }

    elements.noteContentEditor.focus();
}

function showEditorStatus(message, type = 'info', duration = 0) {
    if (!elements.noteEditorStatus) return;

    clearEditorStatus();

    elements.noteEditorStatus.textContent = message;
    elements.noteEditorStatus.classList.add(`note-editor-status--${type}`);

    if (duration > 0) {
        editorStatusTimeoutId = setTimeout(() => {
            clearEditorStatus();
        }, duration);
    }
}

function clearEditorStatus() {
    if (!elements.noteEditorStatus) return;

    if (editorStatusTimeoutId) {
        clearTimeout(editorStatusTimeoutId);
        editorStatusTimeoutId = null;
    }
    elements.noteEditorStatus.textContent = '';
    elements.noteEditorStatus.className = 'note-editor-status';
}

function sanitizeNoteContent(html) {
    if (!html) return '';

    const template = document.createElement('template');
    template.innerHTML = html;

    template.content.querySelectorAll('script, style, iframe, object, embed').forEach((node) => node.remove());

    const allowedTags = new Set([
        'img',
        'br',
        'div',
        'p',
        'strong',
        'b',
        'em',
        'i',
        'u',
        's',
        'ul',
        'ol',
        'li',
        'code',
        'pre',
        'span'
    ]);
    const allowedAttributes = {
        img: ['src', 'alt', 'title']
    };

    const elementsToSanitize = Array.from(template.content.querySelectorAll('*'));
    elementsToSanitize.forEach((node) => {
        const tagName = node.tagName.toLowerCase();
        if (!allowedTags.has(tagName)) {
            const fragment = document.createDocumentFragment();
            while (node.firstChild) {
                fragment.appendChild(node.firstChild);
            }
            node.replaceWith(fragment);
            return;
        }

        Array.from(node.attributes).forEach((attr) => {
            const attrName = attr.name.toLowerCase();
            const allowedForTag = allowedAttributes[tagName] || [];
            if (!allowedForTag.includes(attrName)) {
                node.removeAttribute(attr.name);
                return;
            }

            if (tagName === 'img' && attrName === 'src' && !attr.value.startsWith('data:image/')) {
                node.remove();
            }

            if (tagName === 'img' && (attrName === 'alt' || attrName === 'title')) {
                node.setAttribute(attr.name, attr.value.slice(0, 120));
            }
        });
    });

    const commentWalker = document.createTreeWalker(template.content, NodeFilter.SHOW_COMMENT, null);
    const commentsToRemove = [];
    let currentComment = commentWalker.nextNode();
    while (currentComment) {
        commentsToRemove.push(currentComment);
        currentComment = commentWalker.nextNode();
    }
    commentsToRemove.forEach((comment) => comment.remove());

    return template.innerHTML.trim();
}

function convertPlainTextToHtml(text) {
    return escapeHtml(text).replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
}

function normalizeNoteContent(content) {
    if (!content) return '';

    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(content);
    const html = looksLikeHtml ? content : convertPlainTextToHtml(content);
    return sanitizeNoteContent(html);
}

function extractPlainTextFromHtml(html) {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return (tempDiv.textContent || tempDiv.innerText || '').trim();
}

function hasMeaningfulContent(html) {
    if (!html) return false;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const hasText = (tempDiv.textContent || '').trim().length > 0;
    const hasImages = tempDiv.querySelectorAll('img').length > 0;

    return hasText || hasImages;
}

function formatFileSize(bytes) {
    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (bytes >= 1024) {
        return `${Math.round(bytes / 1024)} KB`;
    }
    return `${bytes} B`;
}

function focusEditorAtEnd(element) {
    element.focus();

    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    if (element.childNodes.length > 0) {
        const lastNode = element.childNodes[element.childNodes.length - 1];
        if (lastNode.nodeType === Node.TEXT_NODE) {
            range.setStart(lastNode, lastNode.textContent.length);
        } else {
            range.setStartAfter(lastNode);
        }
    } else {
        range.selectNodeContents(element);
        range.collapse(false);
    }

    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

// Inline editing functions
function setupInlineEditor(card, note, isExpanded) {
    const toolbar = card.querySelector('.inline-editor-toolbar');
    const saveBtn = card.querySelector('.inline-save-btn');
    const uploadBtn = card.querySelector('.inline-upload-btn');
    const imageInput = card.querySelector('.inline-image-upload-input');
    const editor = card.querySelector('.inline-note-editor');
    const titleInput = card.querySelector('.inline-title-input');
    const categoryInput = card.querySelector('.inline-category-input');

    if (!editor || !toolbar) {
        return;
    }

    editor.dataset.noteId = note.id;

    if (uploadBtn && imageInput) {
        uploadBtn.addEventListener('click', () => {
            imageInput.click();
        });

        imageInput.addEventListener('change', (e) => {
            handleInlineImageUpload(e, editor, card);
        });
    }

    editor.addEventListener('paste', (e) => {
        handleInlineEditorPaste(e, editor, card);
    });

    // Setup auto-save for inline editor
    const triggerInlineAutoSave = debounce(() => {
        autoSaveInlineNote(note.id, card);
    }, AUTO_SAVE_DELAY);

    editor.addEventListener('input', triggerInlineAutoSave);
    
    if (titleInput) {
        titleInput.addEventListener('input', triggerInlineAutoSave);
        
        titleInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                editor.focus();
            }
        });
    }

    if (categoryInput) {
        categoryInput.addEventListener('input', triggerInlineAutoSave);
        
        categoryInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                editor.focus();
            }
        });
    }

    setInlineEditMode(card, note, isExpanded, { focus: false });
}

function setInlineEditMode(card, note, isEditing, options = {}) {
    const { focus = false } = options;
    const toolbar = card.querySelector('.inline-editor-toolbar');
    const saveBtn = card.querySelector('.inline-save-btn');
    const editor = card.querySelector('.inline-note-editor');
    const statusElement = card.querySelector('.inline-editor-status');
    const titleInput = card.querySelector('.inline-title-input');
    const categoryInput = card.querySelector('.inline-category-input');
    const titleDisplay = card.querySelector('.note-title');

    if (toolbar) {
        toolbar.style.display = isEditing ? 'flex' : 'none';
    }

    if (saveBtn) {
        saveBtn.style.display = isEditing ? 'inline-block' : 'none';
    }

    if (editor) {
        editor.setAttribute('contenteditable', isEditing ? 'true' : 'false');
        editor.classList.toggle('is-editing', isEditing);

        if (isEditing && focus) {
            requestAnimationFrame(() => {
                focusEditorAtEnd(editor);
            });
        }

        if (!isEditing) {
            editor.blur();
            clearInlineEditorStatus(statusElement);
        }
    }

    if (titleInput) {
        titleInput.disabled = !isEditing;
        if (!isEditing && note) {
            titleInput.value = note.title || '';
        }
    }

    if (categoryInput) {
        categoryInput.disabled = !isEditing;
        if (!isEditing && note) {
            categoryInput.value = note.category || '';
        }
    }

    if (!isEditing && titleDisplay && note) {
        const safeTitle = escapeHtml((note.title || '').trim() || 'Untitled note');
        titleDisplay.innerHTML = note.isPinned ? `📌 ${safeTitle}` : safeTitle;
    }

    card.classList.toggle('is-inline-editing', isEditing);
}

// Auto-save inline note with retry logic
async function autoSaveInlineNote(noteId, card, retryCount = 0) {
    if (!db) {
        return;
    }

    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const editor = card.querySelector('.inline-note-editor');
    const titleInput = card.querySelector('.inline-title-input');
    const categoryInput = card.querySelector('.inline-category-input');
    const autoSaveStatus = card.querySelector('.inline-auto-save-status');
    
    if (!editor) return;

    const title = (titleInput ? titleInput.value : (note.title || '')).trim();
    const category = categoryInput ? categoryInput.value.trim() : (note.category || '');
    const editorHtml = editor.innerHTML;
    const sanitizedContent = sanitizeNoteContent(editorHtml);
    const contentHasValue = hasMeaningfulContent(sanitizedContent);

    // Don't auto-save if title is empty or content has no value
    if (!title || !contentHasValue) {
        return;
    }

    editor.innerHTML = sanitizedContent;

    try {
        updateAutoSaveStatus(autoSaveStatus, 'saving');
        updateSyncStatus('syncing');

        await db.collection('notes').doc(noteId).update({
            title,
            content: sanitizedContent,
            category,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (titleInput) {
            titleInput.value = title;
        }
        if (categoryInput) {
            categoryInput.value = category;
        }

        const titleDisplay = card.querySelector('.note-title');
        if (titleDisplay) {
            const safeTitle = escapeHtml(title);
            titleDisplay.innerHTML = note.isPinned ? `📌 ${safeTitle}` : safeTitle;
        }

        const tagChips = [];
        if (category) {
            tagChips.push(`<span class="note-tag note-tag--category">${escapeHtml(category)}</span>`);
        }
        if (Array.isArray(note.tags)) {
            note.tags.filter(Boolean).forEach(tag => {
                tagChips.push(`<span class="note-tag">${escapeHtml(tag)}</span>`);
            });
        }

        let tagsContainer = card.querySelector('.note-tags');
        const categoryField = card.querySelector('.inline-category-field');
        const contentWrapper = card.querySelector('.note-content-wrapper');

        if (tagChips.length) {
            if (!tagsContainer) {
                tagsContainer = document.createElement('div');
                tagsContainer.className = 'note-tags';
                if (categoryField) {
                    categoryField.insertAdjacentElement('beforebegin', tagsContainer);
                } else if (contentWrapper) {
                    contentWrapper.insertAdjacentElement('beforebegin', tagsContainer);
                }
            }
            tagsContainer.innerHTML = tagChips.join('');
        } else if (tagsContainer) {
            tagsContainer.remove();
        }

        note.title = title;
        note.category = category;
        note.content = sanitizedContent;
        note.plainContent = extractPlainTextFromHtml(sanitizedContent);
        note.updatedAt = new Date();

        updateCategories();
        updateCategoryFilter();

        updateAutoSaveStatus(autoSaveStatus, 'saved');
    } catch (error) {
        console.error('Auto-save inline note error:', error);
        
        // Retry logic with exponential backoff
        if (retryCount < MAX_RETRY_ATTEMPTS) {
            const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
            updateAutoSaveStatus(autoSaveStatus, 'error', `Retrying in ${delay / 1000}s...`);
            
            setTimeout(() => {
                autoSaveInlineNote(noteId, card, retryCount + 1);
            }, delay);
        } else {
            updateAutoSaveStatus(autoSaveStatus, 'error', 'Save failed');
            updateSyncStatus('error');
        }
    }
}

async function saveInlineNote(noteId, card) {
    if (!db) {
        showToast('Cloud sync not available', 'error');
        return;
    }

    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const editor = card.querySelector('.inline-note-editor');
    const titleInput = card.querySelector('.inline-title-input');
    const categoryInput = card.querySelector('.inline-category-input');
    
    if (!editor) return;

    const title = (titleInput ? titleInput.value : (note.title || '')).trim();
    const category = categoryInput ? categoryInput.value.trim() : (note.category || '');
    const editorHtml = editor.innerHTML;
    const sanitizedContent = sanitizeNoteContent(editorHtml);
    const contentHasValue = hasMeaningfulContent(sanitizedContent);

    if (!title) {
        showToast('Please provide a note title', 'error');
        if (titleInput) titleInput.focus();
        return;
    }

    if (!contentHasValue) {
        showToast('Add text or images to your note before saving', 'error');
        editor.focus();
        return;
    }

    editor.innerHTML = sanitizedContent;

    const saveBtn = card.querySelector('.inline-save-btn');
    const statusElement = card.querySelector('.inline-editor-status');

    try {
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.classList.add('is-loading');
            saveBtn.setAttribute('aria-busy', 'true');
        }

        showInlineEditorStatus(statusElement, 'Saving changes...', 'info');
        updateSyncStatus('syncing');

        await db.collection('notes').doc(noteId).update({
            title,
            content: sanitizedContent,
            category,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (titleInput) {
            titleInput.value = title;
        }
        if (categoryInput) {
            categoryInput.value = category;
        }

        const titleDisplay = card.querySelector('.note-title');
        if (titleDisplay) {
            const safeTitle = escapeHtml(title);
            titleDisplay.innerHTML = note.isPinned ? `📌 ${safeTitle}` : safeTitle;
        }

        const tagChips = [];
        if (category) {
            tagChips.push(`<span class="note-tag note-tag--category">${escapeHtml(category)}</span>`);
        }
        if (Array.isArray(note.tags)) {
            note.tags.filter(Boolean).forEach(tag => {
                tagChips.push(`<span class="note-tag">${escapeHtml(tag)}</span>`);
            });
        }

        let tagsContainer = card.querySelector('.note-tags');
        const categoryField = card.querySelector('.inline-category-field');
        const contentWrapper = card.querySelector('.note-content-wrapper');

        if (tagChips.length) {
            if (!tagsContainer) {
                tagsContainer = document.createElement('div');
                tagsContainer.className = 'note-tags';
                if (categoryField) {
                    categoryField.insertAdjacentElement('beforebegin', tagsContainer);
                } else if (contentWrapper) {
                    contentWrapper.insertAdjacentElement('beforebegin', tagsContainer);
                }
            }
            tagsContainer.innerHTML = tagChips.join('');
        } else if (tagsContainer) {
            tagsContainer.remove();
        }

        note.title = title;
        note.category = category;
        note.content = sanitizedContent;
        note.plainContent = extractPlainTextFromHtml(sanitizedContent);
        note.updatedAt = new Date();

        updateCategories();
        updateCategoryFilter();

        showInlineEditorStatus(statusElement, 'Changes saved!', 'success', 2600);
        showToast('Note updated successfully! ✅');
    } catch (error) {
        console.error('Save inline note error:', error);
        showInlineEditorStatus(statusElement, 'Failed to save note', 'error', 3200);
        showToast('Failed to save note: ' + error.message, 'error');
        updateSyncStatus('error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('is-loading');
            saveBtn.removeAttribute('aria-busy');
        }
    }
}

async function handleInlineImageUpload(event, editor, card) {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
        return;
    }

    for (const file of files) {
        if (!validateImageFile(file)) {
            continue;
        }
        await processInlineImage(file, editor, card);
    }

    event.target.value = '';
}

function handleInlineEditorPaste(event, editor, card) {
    if (!editor) return;

    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const items = clipboardData.items ? Array.from(clipboardData.items) : [];
    const imageItem = items.find((item) => item.type && item.type.startsWith('image/'));

    if (imageItem) {
        event.preventDefault();
        const file = imageItem.getAsFile();
        if (file && validateImageFile(file)) {
            processInlineImage(file, editor, card);
        }
        return;
    }

    const text = clipboardData.getData('text/plain');
    if (typeof text === 'string' && text.length > 0) {
        event.preventDefault();
        insertTextAtCursorInline(text, editor);
    }
}

async function processInlineImage(file, editor, card) {
    const statusElement = card.querySelector('.inline-editor-status');
    const uploadBtn = card.querySelector('.inline-upload-btn');

    try {
        if (uploadBtn) {
            uploadBtn.disabled = true;
            uploadBtn.classList.add('is-loading');
        }
        
        showInlineEditorStatus(statusElement, 'Adding image...', 'info');

        const dataUrl = await readFileAsDataURL(file);
        insertImageIntoInlineEditor(dataUrl, file.name, editor);

        showToast('Image added to note 🖼️');
        showInlineEditorStatus(statusElement, `Image added (${formatFileSize(file.size)})`, 'success', 3200);
    } catch (error) {
        console.error('Image processing error:', error);
        showInlineEditorStatus(statusElement, 'Failed to add image', 'error', 4000);
        showToast('Failed to add image', 'error');
    } finally {
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.classList.remove('is-loading');
        }
    }
}

function insertImageIntoInlineEditor(dataUrl, fileName, editor) {
    if (!editor) return;

    const img = document.createElement('img');
    img.src = dataUrl;
    const trimmedName = (fileName || '').trim();
    if (trimmedName) {
        const altText = trimmedName.replace(/\.[^/.]+$/, '');
        img.alt = altText || 'Note image';
        img.title = trimmedName;
    } else {
        img.alt = 'Note image';
    }
    img.loading = 'lazy';

    const selection = window.getSelection();
    let range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    if (!range || !editor.contains(range.commonAncestorContainer)) {
        range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
    }

    range.deleteContents();
    range.insertNode(img);

    const spacer = document.createElement('br');
    img.insertAdjacentElement('afterend', spacer);

    range.setStartAfter(spacer);
    range.collapse(true);

    if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
    }

    editor.focus();
}

function insertTextAtCursorInline(text, editor) {
    if (!editor) return;

    const normalizedText = text.replace(/\r\n/g, '\n');
    const lines = normalizedText.split('\n');

    const selection = window.getSelection();
    let range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    if (!range || !editor.contains(range.commonAncestorContainer)) {
        range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
    }

    range.deleteContents();

    lines.forEach((line, index) => {
        if (line.length) {
            const textNode = document.createTextNode(line);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
        }
        if (index < lines.length - 1) {
            const br = document.createElement('br');
            range.insertNode(br);
            range.setStartAfter(br);
        }
    });

    range.collapse(true);

    if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
    }

    editor.focus();
}

function showInlineEditorStatus(statusElement, message, type = 'info', duration = 0) {
    if (!statusElement) return;

    clearInlineEditorStatus(statusElement);

    statusElement.textContent = message;
    statusElement.classList.add(`note-editor-status--${type}`);

    if (duration > 0) {
        const timerId = setTimeout(() => {
            clearInlineEditorStatus(statusElement);
        }, duration);
        inlineEditorStatusTimers.set(statusElement, timerId);
    }
}

function clearInlineEditorStatus(statusElement) {
    if (!statusElement) return;

    const existingTimer = inlineEditorStatusTimers.get(statusElement);
    if (existingTimer) {
        clearTimeout(existingTimer);
        inlineEditorStatusTimers.delete(statusElement);
    }

    statusElement.textContent = '';
    statusElement.className = 'inline-editor-status note-editor-status';
}

// Make functions available globally for inline event handlers
window.openEditNoteModal = openEditNoteModal;
window.deleteNote = deleteNote;
window.togglePin = togglePin;
window.toggleArchive = toggleArchive;
window.downloadNote = downloadNote;

init();
