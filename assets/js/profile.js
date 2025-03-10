import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Load Profile Function
export async function loadProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('user');
  
  if (!userId) {
    alert("No profile to display.");
    window.location.href = "dashboard.html";
    return;
  }

  const userDoc = await getDoc(doc(db, "users", userId));
  if (!userDoc.exists()) {
    alert("User not found.");
    window.location.href = "dashboard.html";
    return;
  }

  const userData = userDoc.data();
  displayProfile(userData);
}

// Display Profile Function
function displayProfile(data) {
  const profileDiv = document.getElementById("profile");
  profileDiv.innerHTML = `
    <h2>${data.name}'s Profile</h2>
    <p><strong>Email:</strong> ${data.email}</p>
    <p><strong>Phone:</strong> ${data.phone || "Not Provided"}</p>
    <p><strong>Address:</strong> ${data.address || "Not Provided"}</p>
    <p><strong>Role:</strong> ${data.role}</p>
    ${data.role === "service_provider" ? `<p><strong>Government ID:</strong> <a href="${data.govID}" target="_blank">View ID</a></p>` : ''}
    <button onclick="window.location.href='dashboard.html'">Back to Dashboard</button>
  `;
}

// Auto-load Profile
loadProfile();
