import { auth, db } from "./firebase.js";
import {
  doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let userId;
let latestServiceId = null;
let subscriptionPlan = "Free";
let remainingRequests = 1;
let subscriptionStatus = "Active";

// ✅ Authenticate User
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("You are not signed in. Redirecting...");
    window.location.href = "signin.html";
    return;
  }

  userId = user.uid;
  await loadUserProfile();
  await checkSubscription();
  await loadUserServices();
});

// ✅ Load Profile
async function loadUserProfile() {
  const userDoc = await getDoc(doc(db, "users", userId));

  if (userDoc.exists()) {
    const userData = userDoc.data();
    document.getElementById("username").value = userData.username || "";
    document.getElementById("phone").value = userData.phone || "";
    document.getElementById("address").value = userData.address || "";

    if (userData.phone && userData.address) {
      document.getElementById("section-1").classList.add("hidden");
      document.getElementById("section-2").classList.remove("hidden");
      document.getElementById("section-3").classList.remove("hidden");
      document.getElementById("section-5").classList.remove("hidden");
    }
  }
}

document.getElementById("profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const phone = document.getElementById("phone").value;
  const address = document.getElementById("address").value;

  await setDoc(doc(db, "users", userId), {
    username,
    phone,
    address,
    role: "user"
  }, { merge: true });

  alert("Profile Updated!");
  location.reload();
});

// ✅ Check Subscription & Update UI
async function checkSubscription() {
  const subDoc = await getDoc(doc(db, "subscriptions", userId));

  if (subDoc.exists()) {
    const data = subDoc.data();
    subscriptionPlan = data.plan;
    remainingRequests = data.remainingRequests;
    subscriptionStatus = data.status || "Active";

    document.getElementById("plan").innerText = `Current Plan: ${subscriptionPlan}`;
    document.getElementById("remaining-requests").innerText = `Remaining Requests: ${remainingRequests}`;

    const upgradeBtn = document.getElementById("upgrade-btn");
    if (upgradeBtn) {
      if (subscriptionStatus === "Pending") {
        upgradeBtn.innerText = "Pending Approval";
        upgradeBtn.disabled = true;
      } else if (subscriptionPlan === "Gold") {
        upgradeBtn.innerText = "Gold Plan Active";
        upgradeBtn.disabled = true;
      } else {
        upgradeBtn.innerText = "Upgrade to Gold (₹199/month)";
        upgradeBtn.disabled = false;
      }
    }
  } else {
    await setDoc(doc(db, "subscriptions", userId), {
      plan: "Free",
      remainingRequests: 1,
      status: "Active"
    });
    location.reload();
  }
}

// ✅ Request Gold Plan (Admin Approval Needed)
window.requestGoldPlan = async () => {
  await setDoc(doc(db, "subscriptions", userId), {
    plan: "Gold",
    remainingRequests: 35,
    status: "Pending"
  });

  subscriptionPlan = "Gold"; // ✅ Update UI Immediately
  alert("Gold Plan Upgrade Requested. Waiting for Admin Approval.");
  checkSubscription();
};

// ✅ Request Service & Auto-Assign Provider
document.getElementById("request-service-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (subscriptionStatus === "Pending") {
    alert("Your subscription upgrade is pending approval.");
    return;
  }

  if (remainingRequests <= 0) {
    alert("Request limit reached. Upgrade to Gold.");
    return;
  }

  const service = document.getElementById("service").value;
  const serviceProvider = await autoAssignServiceProvider();

  if (!serviceProvider) {
    alert("No available service providers nearby.");
    return;
  }

  const docRef = await addDoc(collection(db, "services"), {
    serviceName: service,
    requestedBy: userId,
    assignedTo: serviceProvider,
    status: "Assigned"
  });

  latestServiceId = docRef.id;

  await updateDoc(doc(db, "subscriptions", userId), {
    remainingRequests: remainingRequests - 1
  });

  alert("Service Requested and Assigned!");
  location.reload();
});

// ✅ Auto-Assign Service Provider Based on Service & Location
async function autoAssignServiceProvider() {
  const serviceType = document.getElementById("service").value;

  const userRef = await getDoc(doc(db, "users", userId));
  if (!userRef.exists()) return null;
  const userLocation = userRef.data().location;

  if (!userLocation || !userLocation.lat || !userLocation.lon) {
    alert("Your location is missing. Update your profile first.");
    return null;
  }

  const q = query(collection(db, "users"), where("role", "==", "service_provider"), where("service", "==", serviceType));
  const providers = await getDocs(q);

  if (providers.empty) {
    return null;
  }

  let nearestProvider = null;
  let minDistance = Infinity;

  providers.forEach((provider) => {
    const providerData = provider.data();
    if (providerData.location && providerData.location.lat && providerData.location.lon) {
      const distance = calculateDistance(userLocation, providerData.location);
      if (distance < minDistance) {
        minDistance = distance;
        nearestProvider = provider.id;
      }
    }
  });

  if (!nearestProvider) {
    return null;
  }

  return nearestProvider;
}

// ✅ Calculate Distance (Haversine Formula)
function calculateDistance(userLoc, providerLoc) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; 

  const lat1 = userLoc.lat, lon1 = userLoc.lon;
  const lat2 = providerLoc.lat, lon2 = providerLoc.lon;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
