import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Initialize Dashboard
export async function initializeDashboard() {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      alert("Not signed in. Redirecting to sign-in page.");
      window.location.href = "signin.html";
      return;
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      alert("User data not found!");
      return;
    }

    const userData = userDoc.data();
    const role = userData.role;
    const dashboard = document.getElementById("dashboard");

    // Load dashboard content based on user role
    if (role === "user") {
      window.location.href = 'user.html';
    } else if (role === "service_provider") {
      window.location.href = 'service_provider.html';
    } else if (role === "admin") {
      window.location.href = 'admin.html';
    } else {
      dashboard.innerHTML = `<p>Role not recognized.</p>`;
    }
  });
