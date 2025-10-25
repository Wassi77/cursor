# Personal Note-Taking Website

A password-protected personal note-taking web application designed for Netlify deployment. Capture, organize, and manage your thoughts and concepts from any device with this clean, modern, and fully client-side solution.

## Features

### 🔒 Authentication
- Simple password-based authentication
- Session persistence to avoid repeated logins
- Default password: `notes123` (can be changed in script.js)
- Quick logout functionality

### 📝 Note Management (CRUD)
- **Create**: Quick add new notes with title and content
- **Read**: View all notes in an organized list
- **Update**: Edit existing notes from any device
- **Delete**: Remove notes with confirmation dialog
- **Images**: Upload or paste images directly into notes

### 🏷️ Organization Features
- **Categorize**: Add categories/tags to notes for better organization
- **Search**: Real-time search across titles, content, and categories
- **Filter**: Filter notes by category
- **Sort**: Sort by date (created/modified) or title
- **Pin**: Pin important notes to the top of the list
- **Archive**: Archive completed or old notes (access via Archive button)

### 💾 Download & Export
- Download individual notes as text files
- Export all notes as JSON backup with metadata
- Preserve formatting in downloads

### 🎨 UI/UX Design
- Clean, modern, intuitive interface
- Mobile-responsive design (works on all devices)
- Dark/light theme toggle with system preference detection
- Visual feedback for all actions (save, delete, etc.)
- Smooth transitions and animations
- Empty state guidance

### ⚡ Technical Implementation
- Pure HTML, CSS, JavaScript (no dependencies)
- **Cloud Database**: Firebase Firestore for cross-device sync
- **Offline Support**: Works without internet, syncs when reconnected
- **Real-time Sync**: Instant updates across all devices
- **Migration**: Automatic migration from localStorage to cloud
- Cross-browser compatible
- Mobile-first responsive design
- Optimized for Netlify static hosting

### ☁️ Cloud Sync Features
- **Cross-Device Access**: Access your notes from any device
- **Real-time Synchronization**: Changes sync instantly across all devices
- **Offline Mode**: Create and edit notes offline, auto-sync when back online
- **Sync Status Indicator**: Visual feedback showing sync state (synced, syncing, offline, error)
- **Automatic Migration**: Seamlessly migrate existing localStorage notes to cloud
- **Conflict-Free**: Firestore handles concurrent edits automatically

## Quick Start

### Local Development

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd <your-repo-name>
   ```

2. Copy the Firebase configuration template and add your project credentials:
   ```bash
   cp firebase-config.example.js firebase-config.js
   ```
   Update the new `firebase-config.js` with your Firebase settings. See [Firebase Setup](#firebase-setup) for step-by-step guidance.

3. (Optional) Update the access password in `firebase-config.js` by setting `window.firestoreAccessPassword` to your desired password.

4. Open `index.html` in your browser or use a local server:
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Using Node.js (if http-server is installed)
   npx http-server
   ```

5. Navigate to `http://localhost:8000` in your browser

6. Login with your configured password (default: `notes123`)

### Firebase Setup

**⚠️ Important:** To enable cloud synchronization, you must set up Firebase Firestore. Without it, the app will show an error.

Follow the detailed setup guide in **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** for step-by-step instructions.

**Quick summary:**
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/)
2. Enable Firestore Database and Anonymous Authentication
3. Copy `firebase-config.example.js` to `firebase-config.js`
4. Add your Firebase credentials to `firebase-config.js`
5. (Optional) Set a custom password in the same file

### Changing the Password

To change the default password, edit `firebase-config.js`:

```javascript
window.firestoreAccessPassword = "your-secure-password";
```

**Note:** The password is checked on the frontend only. Anyone with access to the source code can see it, so don't use this for highly sensitive information.

## Deployment to Netlify

### Option 1: Deploy via Netlify UI

1. Create a free account at [netlify.com](https://www.netlify.com)

2. Click "Add new site" → "Deploy manually"

3. Drag and drop your project folder (or zip file)

4. Your site will be live at a unique Netlify URL (e.g., `https://your-site-name.netlify.app`)

### Option 2: Deploy via GitHub

1. Push your code to a GitHub repository

2. Go to [netlify.com](https://www.netlify.com) and click "Add new site" → "Import an existing project"

3. Connect your GitHub account and select your repository

4. Configure build settings:
   - Build command: (leave empty)
   - Publish directory: `.` (or leave empty)

5. Click "Deploy site"

### Option 3: Deploy via Netlify CLI

1. Install the Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```bash
   netlify login
   ```

3. Initialize and deploy:
   ```bash
   netlify init
   netlify deploy --prod
   ```

## Usage Guide

### Creating Notes
1. Click the "➕ New Note" button
2. Enter a title and content (required)
3. Optionally add a category
4. Optionally add images by clicking "🖼️ Upload Image" or pasting with Ctrl+V/Cmd+V
5. Click "Save Note"

### Editing Notes
1. Find your note in the list
2. Click the "✏️ Edit" button
3. Make your changes
4. Click "Save Note"

### Organizing Notes
- **Search**: Use the search bar to find notes by title, content, or category
- **Filter**: Select a category from the dropdown to filter notes
- **Sort**: Choose a sorting option (Modified Date, Created Date, or Title)
- **Pin**: Click "📍 Pin" to keep important notes at the top
- **Archive**: Click "📦 Archive" to hide notes from the main view

### Viewing Archived Notes
1. Click the "📦 Archived" button in the toolbar
2. View all archived notes in a modal
3. Unarchive or delete notes as needed

### Downloading Notes
- **Single Note**: Click "💾 Download" on any note to download it as a text file
- **All Notes**: Click "💾 Export All" to download all notes as a JSON backup

### Theme Toggle
Click the theme button (🌙/☀️) in the header to switch between light and dark modes. Your preference is saved automatically.

## Data Storage

Cloud synchronization is handled by **Firebase Firestore**:
- **Notes**: Stored in Firestore with metadata (id, title, content, category, tags, timestamps, pinned, archived)
- **Real-time Sync**: Changes propagate instantly across connected devices
- **Offline Caching**: Firestore caches data locally and syncs when back online

Local storage is still used for non-sensitive preferences:
- **Authentication Session**: Tracks whether you're logged in on this device
- **Theme Preference**: Stores your light/dark mode selection

⚠️ **Important**: Ensure you have configured Firebase before using the app. Without it, notes cannot be saved.

## Browser Compatibility

Works on all modern browsers:
- Chrome/Edge (v90+)
- Firefox (v88+)
- Safari (v14+)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security Considerations

This application uses **Firebase Firestore** for cloud storage with the following security characteristics:

✅ **Pros**:
- Data stored in secure Google Cloud infrastructure
- Transport encryption (HTTPS/TLS)
- Firebase Anonymous Authentication for backend access control
- Firestore Security Rules to control database access
- Offline persistence with secure local caching

⚠️ **Limitations**:
- Password is checked on the frontend only (anyone with source code access can see it)
- No encryption of data at rest beyond Firebase's default security
- All users sharing the same password access the same note collection
- Suitable for personal use, not for highly sensitive/confidential information

**For better security:**
- Use a strong, unique password in `firebase-config.js`
- Don't commit `firebase-config.js` to public repositories (it's in `.gitignore`)
- Deploy to a private URL if possible
- Regularly backup your notes using the Export feature
- Monitor Firebase Console for unauthorized access attempts

**Firebase Security:**
- Anonymous authentication ensures only authenticated users can access Firestore
- Security Rules prevent unauthorized access to the database
- Firebase audit logs available in the console
- Free tier has generous limits for personal use

## Customization

### Changing Colors
Edit the CSS variables in `styles.css`:
```css
:root {
    --primary-color: #3a86ff; /* Change this to your preferred color */
    --primary-hover: #2c6ddf;
}
```

### Adding Features
The codebase is well-structured and easy to extend:
- `script.js`: All JavaScript functionality
- `styles.css`: All styling
- `index.html`: HTML structure

## File Structure

```
personal-notes/
├── index.html                # Main HTML file
├── styles.css                # All styling and themes
├── script.js                 # Application logic with Firestore integration
├── firebase-config.example.js# Firebase configuration template
├── FIREBASE_SETUP.md         # Detailed Firebase setup instructions
├── .env.example              # Environment variable reference
├── netlify.toml              # Netlify configuration
├── README.md                 # This file
├── LICENSE                   # License file
└── .gitignore                # Git ignore file
```

> **Note:** Create `firebase-config.js` (ignored by Git) with your Firebase credentials based on the provided example file.

## Troubleshooting

### "Firebase configuration not found" Error
- Ensure `firebase-config.js` exists in the project root
- Verify it's properly configured with your Firebase project credentials
- Check the browser console for specific error messages
- See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for setup instructions

### Notes not saving
- Check internet connection and sync status indicator
- Verify Firebase project is set up correctly
- Check browser console for errors (F12)
- Ensure Firestore security rules are configured properly
- Verify you're not exceeding Firebase free tier limits

### Sync Status shows "Error" or "Offline"
- Check your internet connection
- Verify Firebase project credentials are correct
- Check Firebase Console for service status
- Review Firestore Security Rules
- Try logging out and back in

### Migration prompt not appearing
- The app only prompts if localStorage contains notes AND you haven't migrated yet
- Check if `localStorage.getItem('notes')` has data in browser console
- The prompt only shows once; if skipped, it won't show again

### Notes not syncing across devices
- Ensure you're using the same password on both devices
- Verify both devices have internet connectivity
- Check sync status indicator on both devices
- Wait a few seconds for real-time sync to propagate

### Password not working
- Verify you're using the correct password from `firebase-config.js`
- Default is `notes123` unless changed
- Clear browser cache and try again

### Theme not persisting
- Check if localStorage is enabled in your browser
- Try toggling the theme again

### Multiple tabs warning in console
- This is normal - Firestore offline persistence can only be enabled in one tab
- App will still work correctly in all tabs
- Real-time sync will work across all open tabs

### Firebase quota exceeded
- Check your Firebase Console Usage tab
- Free tier: 50K reads/day, 20K writes/day
- Consider exporting notes and clearing old data
- Upgrade to Firebase Blaze plan if needed (pay-as-you-go)

## License

This project is open source and available under the MIT License.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review browser console for errors
3. Verify localStorage is working
4. Check Netlify deployment logs if deployment fails

## Future Enhancements

Possible features to add:
- Import notes from JSON backup
- Rich text editor (WYSIWYG)
- Markdown support and preview
- Color coding for categories
- Keyboard shortcuts
- Note templates
- Bulk operations (delete, archive multiple notes)
- End-to-end encryption for notes
- Enhanced search with regex
- Note versioning/history

---

Made with ❤️ for personal productivity
