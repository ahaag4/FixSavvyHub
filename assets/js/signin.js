import { auth } from './firebase.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js';

const signinForm = document.getElementById('signin-form');

signinForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = signinForm['email'].value;
  const password = signinForm['password'].value;

  try {
    // Sign in without email verification check
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Successful sign-in
    alert('Sign-in successful!');
    window.location.href = 'dashboard.html';
  } catch (error) {
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
