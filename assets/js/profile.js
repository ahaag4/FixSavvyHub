import { auth, db } from "./firebase.js";
import { doc, getDoc, query, where, getDocs, collection } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ✅ Function to Load Profile Data
async function loadProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  let profileId = urlParams.get("id");

  try {
    const user = auth.currentUser;
    if (!user) {
      alert("You are not signed in. Redirecting...");
      window.location.href = "signin.html";
      return;
    }

    // ✅ Fetch logged-in user's details
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.exists() ? userDoc.data() : null;
    const isAdmin = userData?.role === "admin";
    const isServiceProvider = userData?.role === "service_provider";

    // ✅ Allow admins to view any profile
    if (isAdmin) {
      if (!profileId) profileId = user.uid;
    } else if (profileId === user.uid || !profileId) {
      profileId = user.uid; // Users can always view their own profile
    } else {
      // ✅ Check if the user is viewing their assigned service provider
      const assignedProvider = await getAssignedProvider(user.uid);
      const assignedUser = await getAssignedUser(user.uid);

      if (profileId !== assignedProvider && profileId !== assignedUser) {
        alert("You are not authorized to view this profile.");
        window.location.href = "dashboard.html";
        return;
      }
    }

    // ✅ Fetch the profile to display
    const profileRef = doc(db, "users", profileId);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      displayProfile(profileSnap.data(), isAdmin);
    } else {
      document.getElementById("profile-container").innerHTML = `<p style="color: red;">Profile not found</p>`;
    }
  } catch (error) {
    console.error("Error loading profile:", error);
    document.getElementById("profile-container").innerHTML = `<p style="color: red;">Error loading profile</p>`;
  }
}

// ✅ Function to Fetch Assigned Service Provider for a User
async function getAssignedProvider(userId) {
  const q = query(collection(db, "services"), where("requestedBy", "==", userId));
  const querySnapshot = await getDocs(q);

  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    if (data.assignedTo) return data.assignedTo; // Return the first assigned provider found
  }

  return null;
}

// ✅ Function to Fetch Assigned User for a Service Provider
async function getAssignedUser(serviceProviderId) {
  const q = query(collection(db, "services"), where("assignedTo", "==", serviceProviderId));
  const querySnapshot = await getDocs(q);

  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    if (data.requestedBy) return data.requestedBy; // Return the first assigned user found
  }

  return null;
}

// ✅ Function to Display Profile Data
function displayProfile(profile, isAdmin) {
  document.getElementById("profile-name").textContent = profile.username || "N/A";
  document.getElementById("profile-phone").textContent = profile.phone || "N/A";
  document.getElementById("profile-address").textContent = profile.address || "N/A";
  document.getElementById("profile-role").textContent = profile.role || "N/A";

  // ✅ Show email only for admins
  if (isAdmin) {
    document.getElementById("profile-email").textContent = profile.email || "N/A";
    document.getElementById("profile-email").style.display = "block";
  } else {
    document.getElementById("profile-email").style.display = "none";
  }

  // ✅ Show Government ID only for Admins
  if (profile.govID && isAdmin) {
    document.getElementById("gov-id-link").href = profile.govID;
    document.getElementById("gov-id-section").style.display = "block";
  } else {
    document.getElementById("gov-id-section").style.display = "none";
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
