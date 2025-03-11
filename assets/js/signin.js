import { auth, db } from "./firebase.js";
import {
  doc, getDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Sign In Function
document.getElementById("signin-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // ✅ Check the role of the user
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (userDoc.exists()) {
      const role = userDoc.data().role;

      if (role === "user") {
        window.location.href = "user.html"; // Redirect to User Dashboard
      } else if (role === "service_provider") {
        window.location.href = "serviceProvider.html"; // Redirect to Service Provider Dashboard
      } else if (role === "admin") {
        window.location.href = "admin.html"; // Redirect to Admin Dashboard
      } else {
        alert("Invalid Role. Contact Support.");
      }
    } else {
      alert("No profile data found.");
    }
  } catch (error) {
    alert("Error Signing In: " + error.message);
  }
});
