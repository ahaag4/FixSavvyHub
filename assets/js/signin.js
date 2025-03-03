import { auth } from './firebase.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js';

const signinForm = document.getElementById('signin-form');

signinForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = signinForm['email'].value;
  const password = signinForm['password'].value;

  try {
    // Sign in with email and password
    await signInWithEmailAndPassword(auth, email, password);

    // Redirect to dashboard after successful signin
    alert('Sign-in successful!');
    window.location.href = 'dashboard.html';
  } catch (error) {
    console.error('Sign-in error:', error.message);
    alert('Sign-in failed: ' + error.message);
  }
});
