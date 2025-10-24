# Deployment Guide

This guide covers deploying the Personal Notes app with Firebase Firestore integration.

## Prerequisites

Before deploying, ensure you have:

1. ✅ Completed Firebase setup (see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md))
2. ✅ Created `firebase-config.js` with your Firebase credentials
3. ✅ Tested the app locally and verified cloud sync works
4. ✅ Changed the default password if desired

## Important: Security Before Deployment

⚠️ **Do NOT commit `firebase-config.js` to public repositories!**

The `.gitignore` file already includes `firebase-config.js` to prevent accidental commits. However, when deploying, you'll need to handle the configuration differently.

### Option 1: Private Deployment (Recommended)

Deploy to a private/password-protected environment where only you can access the app.

### Option 2: Environment Variables (For hosting platforms that support them)

Some platforms allow you to set environment variables that can be injected into your app at build time. However, since this is a static app with no build step, you'll need to configure Firebase directly on the server or use platform-specific features.

## Deployment Options

### Option A: Netlify Deployment

#### Method 1: Manual Deployment (Simplest)

1. Create `firebase-config.js` locally with your credentials

2. Build/prepare your files for deployment (no build step needed for this app)

3. Go to [Netlify](https://www.netlify.com) and log in

4. Drag and drop your entire project folder to Netlify

5. Your site will be deployed at a unique URL like `https://your-site-name.netlify.app`

⚠️ **Security Note**: With manual deployment, your `firebase-config.js` will be included and visible to anyone who accesses your site's source code. This is acceptable for personal use, but be aware that your Firebase API keys will be publicly visible (though they're protected by Firebase security rules).

#### Method 2: Git-based Deployment

1. **Do NOT commit `firebase-config.js`** to your repository

2. Push your code to GitHub (without `firebase-config.js`)

3. In Netlify:
   - Connect your GitHub repository
   - Add a build command: `echo 'window.firebaseConfig = {...}' > firebase-config.js`
   - Or manually create `firebase-config.js` as a Netlify snippet

4. Use Netlify's **Snippet Injection** feature:
   - Go to Site Settings > Build & Deploy > Post processing > Snippet injection
   - Add a script snippet with your Firebase configuration
   - Inject it into the `<head>` before `</head>`

**Example snippet:**
```html
<script>
window.firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
window.firestoreAccessPassword = "your-password";
</script>
```

#### Method 3: Netlify Environment Variables + Build Script

1. Set up environment variables in Netlify:
   - Go to Site Settings > Build & Deploy > Environment
   - Add variables: `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, etc.

2. Create a `netlify.toml` build configuration:

```toml
[build]
  command = "node generate-config.js"
  publish = "."

[build.environment]
  NODE_VERSION = "18"
```

3. Create `generate-config.js`:

```javascript
const fs = require('fs');

const config = `
const firebaseConfig = {
    apiKey: "${process.env.FIREBASE_API_KEY}",
    authDomain: "${process.env.FIREBASE_AUTH_DOMAIN}",
    projectId: "${process.env.FIREBASE_PROJECT_ID}",
    storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET}",
    messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID}",
    appId: "${process.env.FIREBASE_APP_ID}"
};
window.firestoreAccessPassword = "${process.env.FIRESTORE_ACCESS_PASSWORD}";
window.firebaseConfig = firebaseConfig;
`;

fs.writeFileSync('firebase-config.js', config);
console.log('Firebase config generated successfully');
```

4. Deploy via Git as usual

### Option B: Firebase Hosting

Deploy directly to Firebase Hosting for a fully integrated solution:

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase Hosting in your project directory:
   ```bash
   firebase init hosting
   ```
   - Select your Firebase project
   - Set public directory to `.` (current directory)
   - Configure as single-page app: **No**
   - Don't overwrite existing files

4. Create `firebase-config.js` locally (it can be deployed to Firebase Hosting)

5. Deploy:
   ```bash
   firebase deploy --only hosting
   ```

6. Your app will be available at: `https://your-project-id.web.app`

**Advantages:**
- Same infrastructure as your database
- Easy CDN and SSL
- Custom domain support
- Rollback support

### Option C: Vercel Deployment

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Add environment variables in Vercel dashboard or use snippet injection similar to Netlify

### Option D: GitHub Pages

GitHub Pages works but requires some additional setup for the Firebase config:

1. Use GitHub Secrets to store Firebase credentials
2. Create a GitHub Action to generate `firebase-config.js` on deployment
3. Push to `gh-pages` branch

**Note:** GitHub Pages is public by default, so your Firebase config will be visible.

## Post-Deployment Checklist

After deploying, verify everything works:

- [ ] Site loads without errors
- [ ] Can log in with password
- [ ] Sync status shows "Synced" when online
- [ ] Can create, edit, and delete notes
- [ ] Notes sync in real-time (test with multiple devices/browsers)
- [ ] Offline mode works (disconnect internet, make changes, reconnect)
- [ ] Migration prompt appears if you have localStorage notes
- [ ] Theme toggle works and persists
- [ ] Export and download features work
- [ ] Check browser console for errors

## Firebase API Key Security

**Important:** Firebase API keys in web apps are meant to be public. They identify your Firebase project and are safe to include in client-side code. Security is handled by:

1. **Firestore Security Rules** - Control who can read/write data
2. **Firebase Anonymous Authentication** - Users must be signed in
3. **Frontend Password** - Extra layer for personal use

However, be aware:
- Anyone can see your Firebase project ID and API key
- Your password is also visible in the source code
- This setup is suitable for personal use, not for sensitive data
- For enterprise use, implement proper user authentication

## Monitoring Your Deployment

After deployment, monitor your app:

1. **Firebase Console - Usage Tab**
   - Check read/write operations
   - Monitor storage usage
   - Ensure you're within free tier limits

2. **Firebase Console - Authentication**
   - View anonymous sign-ins
   - Monitor for unusual activity

3. **Netlify/Hosting Analytics**
   - Monitor site traffic
   - Check for errors in logs

4. **Browser Console**
   - Test on different devices
   - Check for JavaScript errors

## Updating Your Deployment

To update your deployed app:

### For Git-based deployments (Netlify, Vercel)
```bash
git add .
git commit -m "Update app"
git push origin main
```
Your hosting platform will automatically redeploy.

### For Firebase Hosting
```bash
firebase deploy --only hosting
```

### For manual deployments
Re-upload your files to the hosting platform.

## Custom Domain Setup

### Netlify
1. Go to Site Settings > Domain management
2. Add custom domain
3. Follow DNS configuration instructions

### Firebase Hosting
```bash
firebase hosting:channel:deploy production --only hosting
```
Then add your custom domain in Firebase Console.

## Troubleshooting Deployment Issues

### "Firebase configuration not found" on deployed site
- Ensure `firebase-config.js` is included in deployment
- Check that the file path is correct
- Verify no build process is removing it
- Check browser console for 404 errors

### CORS errors
- Firebase API calls should not have CORS issues
- If you encounter them, check Firebase project settings
- Ensure your domain is authorized in Firebase Console

### 403 Forbidden errors from Firestore
- Check Firestore Security Rules
- Verify Anonymous Authentication is enabled
- Check that the user is signed in (console.log auth state)

### High Firebase usage/costs
- Implement query limits/pagination
- Add indexes for frequently queried fields
- Monitor Firebase Console usage tab
- Consider caching strategies

## Backup and Disaster Recovery

Before going live:

1. **Export your notes** using the "Export All" button
2. Store the backup in a safe location
3. Test importing notes by manually adding them to a fresh Firebase project
4. Document your Firebase project settings
5. Keep a copy of your `firebase-config.js` in a secure location

## Privacy and Terms of Service

When deploying for personal use, consider:

- Adding a privacy policy (if required by your jurisdiction)
- Documenting data handling practices
- Informing users about Firebase data storage
- Complying with GDPR/CCPA if applicable

## Need Help?

If you encounter issues:

1. Check browser console for errors
2. Verify all setup steps in [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
3. Review Firebase Console for errors/logs
4. Check your hosting platform's documentation
5. Test locally first before deploying
