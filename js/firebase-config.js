// Firebase init for dnd.html cloud sync. Loaded as an ES module.
// The apiKey below is not a secret for Firebase web apps — access is
// controlled by the Firestore security rules (see CLAUDE.md), not by hiding
// this config.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBElkk7fXcBoa7YeQsQ7smHZyYfUENwX-Y",
  authDomain: "powertaxrelief-7ea6f.firebaseapp.com",
  projectId: "powertaxrelief-7ea6f",
  storageBucket: "powertaxrelief-7ea6f.firebasestorage.app",
  messagingSenderId: "377579697952",
  appId: "1:377579697952:web:5b6873a455c648f9734945"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
