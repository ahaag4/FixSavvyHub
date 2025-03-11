import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js';
import { auth, db } from './firebase.js';

const signinForm = document.getElementById('signin-form');

signinForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = signinForm['email'].value;
  const password = signinForm['password'].value;

  try {
    // ✅ Sign in with email and password
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // ✅ Fetch user role from Firestore
    const db = getFirestore();  // Ensure Firestore instance is correct
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      const role = userData.role;

      // ✅ Redirect user based on role
      if (role === "user") {
        window.location.href = 'user.html';
      } else if (role === "service_provider") {
        window.location.href = 'serviceProvider.html';
      } else if (role === "admin") {
        window.location.href = 'admin.html';
      } else {
        alert('Invalid role detected. Please contact support.');
      }
    } else {
      alert('No user data found. Please contact support.');
    }
  } catch (error) {
    console.error('Sign-in error:', error.message);
    alert('Sign-in failed: ' + error.message);
  }
});
