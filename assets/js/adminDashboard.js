import { auth, db } from "./firebase.js";
import {
  doc, getDoc, getDocs, setDoc, deleteDoc, collection, query, where, updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ✅ Admin Dashboard Initialization
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("Not signed in. Redirecting...");
    window.location.href = "signin.html";
    return;
  }

  try {
    // ✅ Check if user is an admin
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      alert("User data not found. Redirecting...");
      window.location.href = "signin.html";
      return;
    }

    const userData = userSnap.data();
    if (userData.role !== "admin") {
      alert("Unauthorized access! Redirecting to dashboard...");
      window.location.href = "dashboard.html"; // Redirect non-admin users
      return;
    }

    // ✅ Load Admin Dashboard Features
    loadAllUsers();
    loadAllProviders();
    loadAllRequests();
    loadAllStats();
    loadSubscriptionRequests();
    loadAdPreview();

  } catch (error) {
    console.error("Error in authentication:", error);
  }
});

// ✅ Logout
window.logout = function () {
  auth.signOut();
  window.location.href = "signin.html";
};

// ✅ Load Stats (Including Subscription Count)
async function loadAllStats() {
  try {
    const users = await getDocs(collection(db, "users"));
    const providers = await getDocs(query(collection(db, "users"), where("role", "==", "service_provider")));
    const requests = await getDocs(collection(db, "services"));
    const subscriptions = await getDocs(query(collection(db, "subscriptions"), where("status", "==", "Approved"))); // ✅ Count only approved subscriptions

    document.getElementById("total-users").textContent = users.size;
    document.getElementById("total-providers").textContent = providers.size;
    document.getElementById("total-requests").textContent = requests.size;
    document.getElementById("total-subscriptions").textContent = subscriptions.size; // ✅ Correct subscription count

  } catch (error) {
    console.error("Error loading stats:", error);
  }
}

// ✅ Load Pending Subscription Requests
async function loadSubscriptionRequests() {
  const requestsDiv = document.getElementById("subscription-requests");
  requestsDiv.innerHTML = `<p>Loading...</p>`;

  try {
    const q = query(collection(db, "subscriptions"), where("status", "==", "Pending"));
    const querySnapshot = await getDocs(q);
    requestsDiv.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const userId = docSnap.id;

      requestsDiv.innerHTML += `
        <div>
          <p><b>User ID:</b> ${userId}</p>
          <p><b>Requested Plan:</b> ${data.plan}</p>
          <button onclick="approveSubscription('${userId}')">Approve</button>
          <button onclick="rejectSubscription('${userId}')">Reject</button>
        </div>
        <hr>
      `;
    });
  } catch (error) {
    console.error("Error loading subscription requests:", error);
  }
}

// ✅ Approve Subscription Request
window.approveSubscription = async function (userId) {
  try {
    await updateDoc(doc(db, "subscriptions", userId), {
      status: "Approved",
      plan: "Gold",
      remainingRequests: 35
    });

    alert("Subscription Approved!");
    loadSubscriptionRequests();
  } catch (error) {
    console.error("Error approving subscription:", error);
  }
};

// ✅ Reject Subscription Request
window.rejectSubscription = async function (userId) {
  try {
    await updateDoc(doc(db, "subscriptions", userId), {
      status: "Rejected",
      plan: "Free",
      remainingRequests: 5
    });

    alert("Subscription Rejected.");
    loadSubscriptionRequests();
  } catch (error) {
    console.error("Error rejecting subscription:", error);
  }
};

// ✅ Upload Ad via URL (Fixed)
async function uploadAd() {
  const adURL = document.getElementById("ad-url").value.trim();
  if (!adURL) {
    alert("Please enter a valid image URL");
    return;
  }

  try {
    await setDoc(doc(db, "ads", "activeAd"), {
      image: adURL,
      status: "active",
      timestamp: new Date()
    });

    alert("Ad uploaded successfully!");
    document.getElementById("ad-url").value = ""; // Clear input after upload
    loadAdPreview(); // Refresh the ad preview
  } catch (error) {
    console.error("Error uploading ad:", error);
    alert("Failed to upload ad.");
  }
}

// ✅ Remove Ad (Fixed)
async function removeAd() {
  try {
    await deleteDoc(doc(db, "ads", "activeAd"));
    alert("Ad removed!");
    document.getElementById("ad-preview").innerHTML = "<p>No active ad</p>";
  } catch (error) {
    console.error("Error removing ad:", error);
    alert("Failed to remove ad.");
  }
}

// ✅ Load Ad Preview (Fixed)
async function loadAdPreview() {
  try {
    const adRef = await getDoc(doc(db, "ads", "activeAd"));

    if (adRef.exists() && adRef.data().status === "active") {
      const adData = adRef.data();
      document.getElementById("ad-preview").innerHTML = `
        <img src="${adData.image}" alt="Ad" style="max-width: 100%; height: auto; display: block; margin-top: 10px;">
      `;
    } else {
      document.getElementById("ad-preview").innerHTML = "<p>No active ad</p>";
    }
  } catch (error) {
    console.error("Error loading ad preview:", error);
    document.getElementById("ad-preview").innerHTML = "<p>Failed to load ad</p>";
  }
}

// ✅ Logout
window.logout = function () {
  auth.signOut();
  window.location.href = "signin.html";
};
