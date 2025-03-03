import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyC0dYCbPoH5mH1QeLI31xrfqnUSbT8Bao0",
  authDomain: "fixeasy-568cd.firebaseapp.com",
  projectId: "fixeasy-568cd",
  storageBucket: "fixeasy-568cd.firebasestorage.app",
  messagingSenderId: "839456909521",
  appId: "1:839456909521:web:8555cb99e40cb5e1753df0",
  measurementId: "G-RQD3RPMZKS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Set session persistence to local
setPersistence(auth, browserLocalPersistence).then(() => {
  console.log("Session persistence set to local.");
}).catch((error) => {
  console.error("Error setting persistence:", error);
});

export { auth, db };
