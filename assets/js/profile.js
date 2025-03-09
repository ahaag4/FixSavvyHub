import { auth, db, storage } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

const profileSection = document.getElementById("profile-section");
const editBtn = document.getElementById("edit-btn");
const editSection = document.getElementById("edit-section");
const profileForm = document.getElementById("profile-form");

let userId;
let userRole;

// ✅ Check Authentication and Load Profile
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("Not signed in. Redirecting to sign-in page.");
    window.location.href = "signin.html";
    return;
  }

  userId = user.uid;
  loadProfile(userId);
});

// ✅ Load Profile Function
async function loadProfile(uid) {
  const urlParams = new URLSearchParams(window.location.search);
  const profileId = urlParams.get("id") || uid;
  const userDoc = await getDoc(doc(db, "users", profileId));

  if (!userDoc.exists()) {
    alert("Profile not found!");
    return;
  }

  const userData = userDoc.data();
  userRole = userData.role;

  document.getElementById("name").textContent = userData.name;
  document.getElementById("email").textContent = userData.email;
  document.getElementById("phone").textContent = userData.phone;
  document.getElementById("address").textContent = userData.address;
  document.getElementById("role").textContent = userData.role;
  document.getElementById("gov-id").href = userData.govID || "#";

  // ✅ If logged-in user is viewing their own profile, allow editing
  if (profileId === userId) {
    editBtn.style.display = "block";
  }

  // ✅ If Admin is viewing anyone's profile, show it but hide edit
  if (userRole === "admin") {
    editBtn.style.display = "none";
  }
}

// ✅ Enable Edit Mode
editBtn.addEventListener("click", () => {
  editSection.style.display = "block";
  editBtn.style.display = "none";
  document.getElementById("edit-phone").value = document.getElementById("phone").textContent;
  document.getElementById("edit-address").value = document.getElementById("address").textContent;
});

// ✅ Handle Profile Update
profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const phone = document.getElementById("edit-phone").value;
  const address = document.getElementById("edit-address").value;
  const govIDFile = document.getElementById("gov-id-file").files[0];

  // ✅ Update profile data
  const updateData = { phone, address };

  // ✅ Upload Government ID if provided
  if (govIDFile) {
    const fileRef = ref(storage, `govIDs/${userId}`);
    await uploadBytes(fileRef, govIDFile);
    const downloadURL = await getDownloadURL(fileRef);
    updateData.govID = downloadURL;
  }

  await updateDoc(doc(db, "users", userId), updateData);
  alert("Profile updated successfully!");
  window.location.reload();
});