// Firebase Configuration
// Copy this file to firebase-config.js and replace with your actual Firebase project credentials
// Get these values from: Firebase Console > Project Settings > General > Your apps

const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-messaging-sender-id",
    appId: "your-app-id"
};

// Optional: Set a custom password for accessing notes
// This is checked on the frontend and also used in Firestore Security Rules
window.firestoreAccessPassword = "notes123";

// Export the config
window.firebaseConfig = firebaseConfig;
