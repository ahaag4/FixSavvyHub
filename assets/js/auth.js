// /assets/js/auth.js
import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js";
import { collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";

// Signup Logic
export async function signup(email, password, role, location) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Save role in Firestore
    await setDoc(doc(db, "users", user.uid), {
      email,
      role, // "admin" or "user"
      location,
    });

    alert("Signup successful!");
    window.location.href = "signin.html";
  } catch (error) {
    alert(error.message);
  }
}

// Sign-in logic
async function signin(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Signed in successfully:", userCredential.user);
    window.location.href = "dashboard.html"; // Redirect to dashboard
  } catch (error) {
    console.error("Error signing in:", error.message);
    alert("Sign-in failed. Please check your credentials.");
  }
}

// Attach event listener to the sign-in form
document.getElementById("signin-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  signin(email, password);
});
