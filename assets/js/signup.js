import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { db } from "./firebase.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Initialize Auth
const auth = getAuth();

const signupForm = document.getElementById("signup-form");

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const location = document.getElementById("location").value;
  const role = document.getElementById("role").value;

  try {
    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Save user data to Firestore
    await setDoc(doc(db, "users", user.uid), {
      email: email,
      location: location,
      role: role,
    });

    alert("Signup successful!");
    window.location.href = "dashboard.html"; // Redirect after successful signup
  } catch (error) {
    console.error("Signup error:", error.message);
    alert("Signup failed: " + error.message);
  }
});
