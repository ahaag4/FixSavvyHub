import { auth, db } from "./firebase.js";
import { doc, getDoc, getDocs, collection, query, where, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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

    if (!userData) {
      alert("Error fetching user data.");
      return;
    }

    const isAdmin = userData.role === "admin";
    const isServiceProvider = userData.role === "service_provider";

    // ✅ Allow admins to view any profile
    if (isAdmin) {
      if (!profileId) profileId = user.uid;
    } else if (profileId === user.uid || !profileId) {
      profileId = user.uid; // Users can always view their own profile
    } else {
      // ✅ Check if the user is viewing their assigned service provider OR their assigned users
      const assignedProvider = await getAssignedProvider(user.uid);
      const assignedUsers = await getAssignedUsers(user.uid);

      if (profileId !== assignedProvider && !assignedUsers.includes(profileId)) {
        alert("You are not authorized to view this profile.");
        window.location.href = "dashboard.html";
        return;
      }
    }

    // ✅ Fetch the profile to display
    const profileRef = doc(db, "users", profileId);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      displayProfile(profileSnap.data(), isAdmin, isServiceProvider, profileId);
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
    if (data.assignedTo) return data.assignedTo;
  }

  return null;
}

// ✅ Function to Fetch All Assigned Users for a Service Provider
async function getAssignedUsers(serviceProviderId) {
  const q = query(collection(db, "services"), where("assignedTo", "==", serviceProviderId));
  const querySnapshot = await getDocs(q);
  let assignedUsers = [];

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.requestedBy) assignedUsers.push(data.requestedBy);
  });

  return assignedUsers;
}

// ✅ Function to Display Profile Data
function displayProfile(profile, isAdmin, isServiceProvider, profileId) {
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

  // ✅ Enable Edit Profile for Admins & Users Editing Their Own Profile
  if (isAdmin || profileId === auth.currentUser.uid) {
    document.getElementById("edit-profile-btn").style.display = "block";
    document.getElementById("edit-profile-btn").onclick = () => enableProfileEditing(profileId);
  }
}

// ✅ Enable Profile Editing
function enableProfileEditing(profileId) {
  document.getElementById("profile-name").contentEditable = true;
  document.getElementById("profile-phone").contentEditable = true;
  document.getElementById("profile-address").contentEditable = true;
  document.getElementById("save-profile-btn").style.display = "block";
  document.getElementById("edit-profile-btn").style.display = "none";

  document.getElementById("save-profile-btn").onclick = async () => {
    const updatedData = {
      username: document.getElementById("profile-name").textContent,
      phone: document.getElementById("profile-phone").textContent,
      address: document.getElementById("profile-address").textContent,
    };

    try {
      await updateDoc(doc(db, "users", profileId), updatedData);
      alert("Profile updated successfully!");
      location.reload();
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile. Please try again.");
    }
  };
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
                                       
