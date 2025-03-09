import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get("user");
  const profileContainer = document.getElementById("profile-container");

  if (!userId) {
    profileContainer.innerHTML = `<p>User ID not provided.</p>`;
    return;
  }

  const userDoc = await getDoc(doc(db, "users", userId));
  if (!userDoc.exists()) {
    profileContainer.innerHTML = `<p>User not found.</p>`;
    return;
  }

  const userData = userDoc.data();
  renderProfile(userData);
});

function renderProfile(userData) {
  const profileContainer = document.getElementById("profile-container");

  const profileHTML = `
    <div class="profile-card">
      <h2>${userData.name}</h2>
      <p><strong>Email:</strong> ${userData.email}</p>
      <p><strong>Phone:</strong> ${userData.phone || 'N/A'}</p>
      <p><strong>Address:</strong> ${userData.address || 'N/A'}</p>
      <p><strong>Role:</strong> ${userData.role}</p>
      <p><strong>Location:</strong> ${userData.location || 'N/A'}</p>
      ${userData.govID ? `<a class="download-btn" href="${userData.govID}" target="_blank">Download Gov ID</a>` : ''}
    </div>
  `;

  profileContainer.innerHTML = profileHTML;
}
