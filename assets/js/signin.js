import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { auth, db } from "./firebase.js";

// Initialize Auth and Firestore
const auth = getAuth();
const db = getFirestore();

// Sign In Function
document.getElementById("signin-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // ✅ Check the role of the user
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (userDoc.exists()) {
      const role = userDoc.data().role;

      if (role === "user") {
        window.location.href = "user.html";
      } else if (role === "service_provider") {
        window.location.href = "serviceProvider.html";
      } else if (role === "admin") {
        window.location.href = "admin.html";
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
