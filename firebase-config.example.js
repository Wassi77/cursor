// Firebase Configuration Template
// ===================================
// 
// SETUP INSTRUCTIONS:
// 1. Copy this file to firebase-config.js in the same directory:
//    cp firebase-config.example.js firebase-config.js
//
// 2. Get your Firebase credentials from the Firebase Console:
//    - Go to https://console.firebase.google.com/
//    - Select or create a Firebase project
//    - In Project Settings > General > Your apps, create or select a web app
//    - Copy the configuration values below
//
// 3. Replace the placeholder values with your actual Firebase project credentials
//
// 4. Optional: Change the password to something secure
//
// 5. Save the file. The app will detect the config and enable cloud sync.
//
// SECURITY NOTE:
// - This file (firebase-config.js) is in .gitignore and won't be committed to Git
// - Never commit firebase-config.js to a public repository
// - The apiKey is public (it's embedded in the app), but is safe with proper Firestore Security Rules
//
// For more detailed setup instructions, see FIREBASE_SETUP.md

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
  // measurementId is optional
};

// Optional: Set a custom password for accessing notes
// This is checked on the frontend only (anyone with source code access can see it)
// For better security, use a strong, unique password
window.firestoreAccessPassword = "notes123";

// Export the config - DO NOT MODIFY THIS LINE
window.firebaseConfig = firebaseConfig;
