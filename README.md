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
- localStorage for data persistence
- Fully client-side (no backend required)
- Cross-browser compatible
- Mobile-first responsive design
- Optimized for Netlify static hosting

## Quick Start

### Local Development

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd <your-repo-name>
   ```

2. Open `index.html` in your browser or use a local server:
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Using Node.js (if http-server is installed)
   npx http-server
   ```

3. Navigate to `http://localhost:8000` in your browser

4. Login with the default password: `notes123`

### Changing the Password

To change the default password, edit the `PASSWORD_HASH` constant in `script.js`:

```javascript
const PASSWORD_HASH = 'your-new-password';
```

For better security, consider implementing a hash function, though note that client-side security has inherent limitations.

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
4. Click "Save Note"

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

All data is stored locally in your browser's localStorage:
- **Notes**: Stored as JSON with metadata (id, title, content, category, timestamps, pinned, archived)
- **Authentication**: Session state stored locally
- **Theme**: User preference saved

⚠️ **Important**: Data is stored per browser/device. To sync across devices:
1. Export your notes as JSON backup
2. Save the backup file to cloud storage (Dropbox, Google Drive, etc.)
3. Import the backup on other devices (manually via localStorage or implement import feature)

## Browser Compatibility

Works on all modern browsers:
- Chrome/Edge (v90+)
- Firefox (v88+)
- Safari (v14+)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security Considerations

This is a **client-side only** application with the following security characteristics:

✅ **Pros**:
- No server-side data storage or processing
- Data stays on your device
- No network requests after initial page load

⚠️ **Limitations**:
- Password is stored in plain text in the JavaScript file
- Anyone with access to the source code can see the password
- No encryption of localStorage data
- Suitable for personal use, not for sensitive/confidential information

For better security:
- Deploy to a private URL
- Use a strong, unique password
- Change the default password
- Consider implementing bcrypt or similar hashing (though it won't prevent client-side inspection)

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
├── index.html          # Main HTML file
├── styles.css          # All styling and themes
├── script.js           # All JavaScript functionality
├── netlify.toml        # Netlify configuration
├── README.md           # This file
├── LICENSE             # License file
└── .gitignore          # Git ignore file
```

## Troubleshooting

### Notes not saving
- Check if localStorage is enabled in your browser
- Check browser console for errors (F12)
- Ensure you're not in private/incognito mode

### Password not working
- Verify you're using the correct password set in `script.js`
- Clear your browser cache and try again

### Theme not persisting
- Check if localStorage is enabled
- Try toggling the theme again

### Mobile issues
- Clear browser cache
- Ensure you're using a modern browser
- Try in a different browser

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
- Cloud sync integration
- Enhanced search with regex
- Note versioning/history

---

Made with ❤️ for personal productivity
