import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Initialize Dashboard
export async function initializeDashboard() {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      alert("Not signed in. Redirecting to sign-in page.");
      window.location.href = "signin.html";
      return;
    }

    try {
      // Fetch user role from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        alert("User data not found!");
        auth.signOut();
        window.location.href = "signin.html";
        return;
      }

      const userData = userDoc.data();
      const role = userData.role;

      // Role-based redirection
      switch (role) {
        case "user":
          window.location.href = 'user.html';
          break;
        case "service_provider":
          window.location.href = 'service_provider.html';
          break;
        case "admin":
          window.location.href = 'admin.html';
          break;
        default:
          alert("Role not recognized. Redirecting to sign-in.");
          auth.signOut();
          window.location.href = "signin.html";
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      alert("An error occurred. Please try again.");
      auth.signOut();
      window.location.href = "signin.html";
    }
  });
}
