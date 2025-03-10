import { auth, db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Function to load profile data
async function loadProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const profileId = urlParams.get("id");

  if (!profileId) {
    alert("Invalid profile ID");
    window.location.href = "dashboard.html";
    return;
  }

  try {
    const profileRef = doc(db, "users", profileId);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      const profileData = profileSnap.data();
      displayProfile(profileData);
    } else {
      alert("Profile not found");
      window.location.href = "dashboard.html";
    }
  } catch (error) {
    console.error("Error loading profile:", error);
    alert("Error loading profile");
    window.location.href = "dashboard.html";
  }
}

// Function to display profile data
function displayProfile(profile) {
  document.getElementById("profile-name").textContent = profile.name;
  document.getElementById("profile-email").textContent = profile.email;
  document.getElementById("profile-phone").textContent = profile.phone || "N/A";
  document.getElementById("profile-address").textContent = profile.address || "N/A";
  document.getElementById("profile-role").textContent = profile.role;

  // ✅ Always Show Government ID if Admin
  if (auth.currentUser && auth.currentUser.email === "admin@gmail.com") {
    document.getElementById("gov-id-link").href = profile.govID;
    document.getElementById("gov-id-section").style.display = "block";
    document.getElementById("profile-email").style.display = "block";
  }

  // 🚫 Hide email for non-admins
  if (auth.currentUser && auth.currentUser.email !== "admin@gmail.com" && auth.currentUser.uid !== profile.uid) {
    document.getElementById("profile-email").style.display = "none";
  }

  // ✅ Show Government ID only if it's their own or Admin
  if (auth.currentUser && (auth.currentUser.email === "admin@gmail.com" || auth.currentUser.uid === profile.uid)) {
    document.getElementById("gov-id-link").href = profile.govID;
    document.getElementById("gov-id-section").style.display = "block";
  }
}

// Function to download profile as PDF
function downloadProfile() {
  const content = document.querySelector(".profile-card").innerHTML;
  const blob = new Blob([content], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "Profile.html";
  a.click();
}

// ✅ Authentication Logic
auth.onAuthStateChanged((user) => {
  const urlParams = new URLSearchParams(window.location.search);
  const profileId = urlParams.get("id");

  // ✅ If Admin, allow access without login
  if (profileId && !user && window.location.href.includes("admin@gmail.com")) {
    loadProfile();
    return;
  }

  // ✅ If User, enforce login
  if (user) {
    loadProfile();
  } else {
    alert("You are not signed in. Redirecting...");
    window.location.href = "signin.html";
  }
});
