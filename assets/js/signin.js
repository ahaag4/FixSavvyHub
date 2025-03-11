import { auth } from './firebase.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js';

const signinForm = document.getElementById('signin-form');

signinForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // ✅ Get email and password from form input fields
  const email = signinForm['email'].value;
  const password = signinForm['password'].value;

  try {
    // ✅ Sign in user with email and password
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // ✅ Check if user email is verified
    if (!user.emailVerified) {
      alert('Please verify your email address before signing in.');
      return;
    }

    // ✅ Redirect user after successful sign-in
    alert('Sign-in successful! Redirecting to dashboard...');
    window.location.href = 'dashboard.html';
  } catch (error) {
    // ✅ Improved error handling
    console.error('Sign-in error:', error.message);

    if (error.code === 'auth/user-not-found') {
      alert('No user found with this email. Please register.');
    } else if (error.code === 'auth/wrong-password') {
      alert('Incorrect password. Please try again.');
    } else if (error.code === 'auth/too-many-requests') {
      alert('Too many unsuccessful login attempts. Please try again later.');
    } else {
      alert('Sign-in failed: ' + error.message);
    }
  }
});
