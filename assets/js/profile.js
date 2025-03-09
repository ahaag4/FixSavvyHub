import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  query,
  collection,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ✅ Automatically load profile based on URL
window.onload = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('id');

  if (!userId) {
    alert("Invalid profile URL!");
    window.location.href = "dashboard.html";
    return;
  }

  // ✅ Fetch logged-in user
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      alert("Please sign in first.");
      window.location.href = "signin.html";
      return;
    }

    const loggedInUserDoc = await getDoc(doc(db, "users", user.uid));
    const loggedInUser = loggedInUserDoc.data();

    // ✅ Admin can access any profile
    if (loggedInUser.role === "admin") {
      await loadProfile(userId);
      return;
    }

    // ✅ Service Provider can access:
    //     1. Their own profile
    //     2. The User's profile assigned to them
    if (loggedInUser.role === "service_provider") {
      if (user.uid === userId) {
        await loadProfile(userId);
        return;
      }

      const assignedUserId = await getAssignedUserId(user.uid);
      if (assignedUserId === userId) {
        await loadProfile(userId);
        return;
      }

      alert("Access denied. You can only view your assigned user's profile.");
      window.location.href = "dashboard.html";
      return;
    }

    // ✅ User can only access their assigned service provider's profile
    if (loggedInUser.role === "user") {
      const assignedProviderId = await getAssignedProviderId(user.uid);
      if (assignedProviderId === userId) {
        await loadProfile(userId);
        return;
      }

      alert("Access denied. You can only view your assigned provider's profile.");
      window.location.href = "dashboard.html";
      return;
    }

    // ✅ Default: No access
    alert("Access denied.");
    window.location.href = "dashboard.html";
  });
};

// ✅ Function to load profile details
async function loadProfile(userId) {
  const userDoc = await getDoc(doc(db, "users", userId));
  if (!userDoc.exists()) {
    alert("Profile not found.");
    window.location.href = "dashboard.html";
    return;
  }

  const userData = userDoc.data();
  document.getElementById('name').innerText = userData.name;
  document.getElementById('email').innerText = userData.email;
  document.getElementById('phone').innerText = userData.phone || 'N/A';
  document.getElementById('address').innerText = userData.address || 'N/A';
  document.getElementById('role').innerText = userData.role;
  document.getElementById('gov-id').innerText = userData.govID || 'N/A';
}

// ✅ Function to get the assigned provider's ID for a user
async function getAssignedProviderId(userId) {
  const q = query(collection(db, "services"), where("requestedBy", "==", userId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const serviceData = querySnapshot.docs[0].data();
  return serviceData.assignedTo;
}

// ✅ Function to get the assigned user's ID for a service provider
async function getAssignedUserId(providerId) {
  const q = query(collection(db, "services"), where("assignedTo", "==", providerId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const serviceData = querySnapshot.docs[0].data();
  return serviceData.requestedBy;
    }
