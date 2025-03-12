import { auth, db } from "./firebase.js";
import { doc, getDoc, updateDoc, query, where, getDocs, collection } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let profileId;
let isAdmin = false;

// ✅ Function to Load Profile Data
async function loadProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  profileId = urlParams.get("id");

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
    isAdmin = userData?.role === "admin";

    // ✅ Allow admins to view & edit any profile
    if (isAdmin) {
      if (!profileId) profileId = user.uid;
    } else {
      // ✅ If user is not admin, check if they are allowed to view this profile
      if (!profileId || profileId === user.uid) {
        profileId = user.uid;
      } else {
        // ✅ Check if this profile is their assigned service provider
        const assignedProvider = await getAssignedProvider(user.uid);
        if (profileId !== assignedProvider) {
          alert("You are not authorized to view this profile.");
          window.location.href = "dashboard.html";
          return;
        }
      }
    }

    // ✅ Fetch and display the profile
    const profileRef = doc(db, "users", profileId);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      displayProfile(profileSnap.data());
    } else {
      document.getElementById("profile-container").innerHTML = `<p style="color: red;">Profile not found</p>`;
    }
  } catch (error) {
    console.error("Error loading profile:", error);
    document.getElementById("profile-container").innerHTML = `<p style="color: red;">Error loading profile</p>`;
  }
}

// ✅ Function to Fetch Assigned Service Provider
async function getAssignedProvider(userId) {
  const q = query(collection(db, "services"), where("requestedBy", "==", userId));
  const querySnapshot = await getDocs(q);
  
  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    if (data.assignedTo) return data.assignedTo;
  }
  
  return null;
}

// ✅ Function to Display Profile Data
function displayProfile(profile) {
  document.getElementById("profile-name").value = profile.username || "";
  document.getElementById("profile-phone").value = profile.phone || "";
  document.getElementById("profile-address").value = profile.address || "";
  document.getElementById("profile-role").textContent = profile.role || "N/A";

  // ✅ Show email only for admins
  if (isAdmin) {
    document.getElementById("profile-email").value = profile.email || "";
    document.getElementById("profile-email-section").style.display = "block";
  } else {
    document.getElementById("profile-email-section").style.display = "none";
  }

  // ✅ Show Government ID only for Admins
  if (profile.govID && isAdmin) {
    document.getElementById("gov-id-link").href = profile.govID;
    document.getElementById("gov-id-section").style.display = "block";
  } else {
    document.getElementById("gov-id-section").style.display = "none";
  }

  // ✅ Enable Editing for Admins or If User is Viewing Their Own Profile
  if (isAdmin || profileId === auth.currentUser.uid) {
    document.getElementById("edit-profile").style.display = "block";
  } else {
    document.getElementById("edit-profile").style.display = "none";
  }
}

// ✅ Function to Update Profile
document.getElementById("save-profile").addEventListener("click", async () => {
  const newUsername = document.getElementById("profile-name").value;
  const newPhone = document.getElementById("profile-phone").value;
  const newAddress = document.getElementById("profile-address").value;
  const newEmail = isAdmin ? document.getElementById("profile-email").value : null;

  try {
    const updates = {
      username: newUsername,
      phone: newPhone,
      address: newAddress
    };

    if (isAdmin && newEmail) {
      updates.email = newEmail;
    }

    await updateDoc(doc(db, "users", profileId), updates);
    alert("Profile updated successfully!");
    location.reload();
  } catch (error) {
    console.error("Error updating profile:", error);
    alert("Error updating profile. Please try again.");
  }
});

// ✅ Automatically Load Profile when User Signs In
auth.onAuthStateChanged((user) => {
  if (user) {
    loadProfile();
  } else {
    alert("You are not signed in. Redirecting...");
    window.location.href = "signin.html";
  }
});
