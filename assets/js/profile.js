import { auth, db } from "./firebase.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ✅ Load Profile Data
async function loadProfile() {
  const user = auth.currentUser;
  if (!user) {
    alert("You are not signed in. Redirecting...");
    window.location.href = "signin.html";
    return;
  }

  const profileRef = doc(db, "users", user.uid);
  const profileSnap = await getDoc(profileRef);

  if (profileSnap.exists()) {
    const profileData = profileSnap.data();
    document.getElementById("profile-name").value = profileData.username || "";
    document.getElementById("profile-email").value = profileData.email || "";
    document.getElementById("profile-phone").value = profileData.phone || "";
    document.getElementById("profile-address").value = profileData.address || "";
    document.getElementById("profile-role").textContent = profileData.role || "N/A";

    // ✅ Show Government ID link for Admins
    if (profileData.role === "admin" && profileData.govID) {
      document.getElementById("gov-id-link").href = profileData.govID;
      document.getElementById("gov-id-section").style.display = "block";
    }

    enableProfileEditing();
  } else {
    alert("Profile not found.");
  }
}

// ✅ Enable Profile Editing
function enableProfileEditing() {
  const editBtn = document.getElementById("edit-profile-btn");
  const saveBtn = document.getElementById("save-profile-btn");
  
  editBtn.addEventListener("click", () => {
    document.getElementById("profile-name").disabled = false;
    document.getElementById("profile-phone").disabled = false;
    document.getElementById("profile-address").disabled = false;
    
    saveBtn.style.display = "block";
    editBtn.style.display = "none";
  });

  saveBtn.addEventListener("click", async () => {
    const updatedData = {
      username: document.getElementById("profile-name").value,
      phone: document.getElementById("profile-phone").value,
      address: document.getElementById("profile-address").value
    };

    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), updatedData);
      alert("Profile updated successfully!");
      location.reload();
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile. Please try again.");
    }
  });
}

// ✅ Load Profile on Page Load
auth.onAuthStateChanged((user) => {
  if (user) {
    loadProfile();
  }
});
