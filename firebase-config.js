// Firebase Configuration
// Copy this file to firebase-config.js and replace with your actual Firebase project credentials
// Get these values from: Firebase Console > Project Settings > General > Your apps

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDowQFAJzl-T0co5wankauLUaWoBsKYzpM",
  authDomain: "personalnotesapp-ee87e.firebaseapp.com",
  projectId: "personalnotesapp-ee87e",
  storageBucket: "personalnotesapp-ee87e.firebasestorage.app",
  messagingSenderId: "197334858189",
  appId: "1:197334858189:web:daf2036e968b7317446c84",
  measurementId: "G-9320VNDZXS"
};

// Optional: Set a custom password for accessing notes
// This is checked on the frontend and also used in Firestore Security Rules
window.firestoreAccessPassword = "notes123";

// Export the config
window.firebaseConfig = firebaseConfig;
