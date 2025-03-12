async function loadProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  let profileId = urlParams.get("id");

  // ✅ Get current logged-in user
  const user = auth.currentUser;

  // ✅ Ensure the user is logged in
  if (!user) {
    alert("You are not signed in. Redirecting...");
    window.location.href = "signin.html";
    return;
  }

  try {
    // ✅ Check if logged-in user is an admin
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.exists() ? userDoc.data() : null;
    const isAdmin = userData?.role === "admin";

    // ✅ If no profile ID, load the logged-in user's profile
    if (!profileId) {
      profileId = user.uid;
    } else if (!isAdmin && profileId !== user.uid) {
      // ❌ Block non-admin users from viewing others' profiles
      alert("You are not authorized to view this profile.");
      window.location.href = "dashboard.html";
      return;
    }

    // ✅ Fetch profile data
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
function displayProfile(profile, isAdmin) {
  document.getElementById("profile-name").textContent = profile.username || "N/A";
  document.getElementById("profile-phone").textContent = profile.phone || "N/A";
  document.getElementById("profile-address").textContent = profile.address || "N/A";
  document.getElementById("profile-role").textContent = profile.role || "N/A";

  // ✅ Show email for admins only
  if (isAdmin) {
    document.getElementById("profile-email").textContent = profile.email || "N/A";
    document.getElementById("profile-email").style.display = "block";
  } else {
    document.getElementById("profile-email").style.display = "none";
  }

  // ✅ Show Government ID only for Admin
  if (profile.govID && isAdmin) {
    document.getElementById("gov-id-link").href = profile.govID;
    document.getElementById("gov-id-section").style.display = "block";
  } else {
    document.getElementById("gov-id-section").style.display = "none";
  }
}
