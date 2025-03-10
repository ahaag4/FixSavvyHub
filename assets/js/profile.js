import { auth, db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Function to fetch profile data
async function loadProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const profileId = urlParams.get("id");

  if (!profileId) {
    document.getElementById("profile-container").innerHTML = `<p>No profile to display</p>`;
    return;
  }

  try {
    const profileRef = doc(db, "users", profileId);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      const profileData = profileSnap.data();
      displayProfile(profileData);
    } else {
      document.getElementById("profile-container").innerHTML = `<p>No profile found</p>`;
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
    document.getElementById("profile-container").innerHTML = `<p>Error loading profile</p>`;
  }
}

// Function to display profile data
function displayProfile(profile) {
  document.getElementById("profile-container").innerHTML = `
    <h2>${profile.name}'s Profile</h2>
    <p><strong>Email:</strong> ${profile.email}</p>
    <p><strong>Phone:</strong> ${profile.phone || "N/A"}</p>
    <p><strong>Address:</strong> ${profile.address || "N/A"}</p>
    <p><strong>Role:</strong> ${profile.role}</p>
    ${profile.govID ? `<p><strong>Government ID:</strong> <a href="${profile.govID}" target="_blank">View ID</a></p>` : ""}
  `;
}

// Initialize profile page
auth.onAuthStateChanged((user) => {
  if (user) {
    loadProfile();
  } else {
    alert("You are not signed in. Redirecting...");
    window.location.href = "signin.html";
  }
});
