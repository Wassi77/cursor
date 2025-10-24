# Firebase Setup Guide

This guide will help you set up Firebase Firestore for cloud synchronization of your notes.

## Prerequisites

- A Google account
- Basic understanding of web development

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter a project name (e.g., "Personal Notes App")
4. (Optional) Enable Google Analytics if desired
5. Click **"Create project"** and wait for it to be created

## Step 2: Register Your Web App

1. In your Firebase project dashboard, click the **Web icon** (`</>`) to add a web app
2. Enter an app nickname (e.g., "Notes Web App")
3. **Do not** check "Set up Firebase Hosting" (unless you plan to use it)
4. Click **"Register app"**
5. You'll see your Firebase configuration object - keep this page open

## Step 3: Create Firebase Configuration File

1. In your project folder, find `firebase-config.example.js`
2. Copy it to create `firebase-config.js`:
   ```bash
   cp firebase-config.example.js firebase-config.js
   ```
3. Open `firebase-config.js` and replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456"
};

// Optional: Change the password for accessing notes
window.firestoreAccessPassword = "your-secure-password";

window.firebaseConfig = firebaseConfig;
```

4. Save the file

## Step 4: Set Up Firestore Database

1. In the Firebase Console, click **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll add security rules next)
4. Select a Cloud Firestore location (choose one closest to your users)
5. Click **"Enable"**

## Step 5: Configure Security Rules

To secure your notes with password protection, set up Firestore Security Rules:

1. In Firestore Database, click the **"Rules"** tab
2. Replace the default rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read and write their notes
    match /notes/{noteId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Note:** This configuration uses Firebase Anonymous Authentication. All users who log in with the correct password on your frontend will be signed in anonymously and can access the notes. For a truly multi-user setup with separate note collections per user, you would need to implement proper user authentication.

### Optional: More Restrictive Rules

If you want to restrict access to a specific authentication token or password hash, you can create more complex rules. However, for a simple personal note-taking app, the above rules are sufficient.

3. Click **"Publish"** to save the rules

## Step 6: Enable Anonymous Authentication

1. In the Firebase Console, click **"Authentication"** in the left sidebar
2. Click **"Get started"** (if it's your first time)
3. Go to the **"Sign-in method"** tab
4. Click on **"Anonymous"**
5. Toggle **"Enable"** to ON
6. Click **"Save"**

## Step 7: Test Your Setup

1. Open your notes application in a web browser
2. Enter your password (default: `notes123` or what you set in `firebase-config.js`)
3. You should see the sync status indicator showing "Synced" (✓) when connected
4. Create a test note and verify it syncs to Firestore:
   - Go to Firebase Console > Firestore Database
   - You should see a `notes` collection with your test note

## Step 8: Test Cross-Device Sync

1. Open your notes app on a different device or browser
2. Log in with the same password
3. You should see all your notes from the first device
4. Create or edit a note on one device
5. Verify it appears/updates on the other device in real-time

## Migrating Existing localStorage Notes

If you had notes stored locally before setting up Firebase:

1. Log in to the app after Firebase setup
2. You'll see a migration prompt showing how many local notes were found
3. Click **"Yes, Migrate"** to sync them to the cloud
4. All your local notes will be uploaded to Firestore
5. The local notes will be cleared after successful migration

## Troubleshooting

### "Firebase configuration not found" Error

- Make sure you created `firebase-config.js` from the example file
- Verify the file is in the same directory as `index.html`
- Check that the file has no syntax errors

### "Permission denied" Errors

- Verify Anonymous Authentication is enabled in Firebase Console
- Check that your Firestore Security Rules are correctly configured
- Make sure you're logged in to the app with the password

### Notes Not Syncing

- Check your internet connection
- Look for errors in the browser console (F12 Developer Tools)
- Verify your Firebase quotas haven't been exceeded (Console > Usage tab)

### Multiple Tabs Warning

- Firestore offline persistence can only be enabled in one tab at a time
- This is normal behavior and doesn't affect functionality
- Notes will still sync across all open tabs

## Firebase Free Tier Limits

Firebase Firestore has a generous free tier suitable for personal use:

- **Reads:** 50,000 per day
- **Writes:** 20,000 per day  
- **Deletes:** 20,000 per day
- **Storage:** 1 GB
- **Network egress:** 10 GB per month

For a personal note-taking app, these limits should be more than sufficient.

## Security Best Practices

1. **Keep `firebase-config.js` private** - It's already in `.gitignore`
2. **Use a strong password** - Change `firestoreAccessPassword` to something secure
3. **Don't share your password** - Anyone with the password can access your notes
4. **Regular backups** - Use the "Export All" feature to backup your notes locally
5. **Monitor usage** - Check Firebase Console usage tab occasionally

## Advanced: Using Firebase Hosting (Optional)

To host your notes app on Firebase Hosting:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Select your Firebase project
# Set public directory to current directory (.)
# Configure as single-page app: Yes
# Set up automatic builds: No
firebase deploy
```

Your app will be available at `https://your-project.firebaseapp.com`

## Support

If you encounter issues:

1. Check the browser console for errors
2. Verify all setup steps were completed
3. Review Firebase Console for quota limits or errors
4. Check that your `firebase-config.js` has correct values

## Next Steps

- Customize the password in `firebase-config.js`
- Test syncing across multiple devices
- Set up regular backups using the Export feature
- Consider setting up Firebase Hosting for easier access
