import { auth, db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ✅ Function to Load Profile Data
async function loadProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  let profileId = urlParams.get("id");

  // ✅ If no profileId is provided, show the logged-in user's profile
  if (!profileId) {
    const user = auth.currentUser;
    if (!user) {
      alert("You are not signed in. Redirecting...");
      window.location.href = "signin.html";
      return;
    }
    profileId = user.uid;
  }

  try {
    const profileRef = doc(db, "users", profileId);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      const profileData = profileSnap.data();
      displayProfile(profileData);
    } else {
      document.getElementById("profile-container").innerHTML = `<p style="color: red;">Profile not found</p>`;
    }
  } catch (error) {
    console.error("Error loading profile:", error);
    document.getElementById("profile-container").innerHTML = `<p style="color: red;">Error loading profile</p>`;
  }
}

// ✅ Function to Display Profile
function displayProfile(profile) {
  document.getElementById("profile-name").textContent = profile.username || "N/A";
  document.getElementById("profile-email").textContent = profile.email || "N/A";
  document.getElementById("profile-phone").textContent = profile.phone || "N/A";
  document.getElementById("profile-address").textContent = profile.address || "N/A";
  document.getElementById("profile-role").textContent = profile.role || "N/A";

  // ✅ Show Government ID only for Admin
  if (profile.govID && profile.role === "admin") {
    document.getElementById("gov-id-link").href = profile.govID;
    document.getElementById("gov-id-section").style.display = "block";
  }

  // ✅ Hide email for normal users or service providers
  if (profile.role !== "admin") {
    document.getElementById("profile-email").style.display = "none";
  }
}

// ✅ Automatically Load Profile when User Signs In
auth.onAuthStateChanged((user) => {
  if (user) {
    loadProfile();
  } else {
    alert("You are not signed in. Redirecting...");
    window.location.href = "signin.html";
  }
});
