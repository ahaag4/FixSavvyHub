import { auth, db } from "./firebase.js";
import {
  doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let userId;
let latestServiceId;
let subscriptionPlan;
let remainingRequests;
let subscriptionStatus;

// Check authentication
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("You are not signed in. Redirecting...");
    window.location.href = "signin.html";
    return;
  }

  userId = user.uid;
  await checkSubscription();
  await loadUserProfile();
  await loadUserServices();
});

// ==========================
// ✅ Section 1: Complete Profile
// ==========================
async function loadUserProfile() {
  const userDoc = await getDoc(doc(db, "users", userId));

  if (userDoc.exists()) {
    const userData = userDoc.data();
    document.getElementById("username").value = userData.username;
    document.getElementById("phone").value = userData.phone;
    document.getElementById("address").value = userData.address;

    if (userData.phone && userData.address) {
      document.getElementById("section-1").classList.add("hidden");
      document.getElementById("section-2").classList.remove("hidden");
      document.getElementById("section-3").classList.remove("hidden");
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

// ==========================
// ✅ Section 2: Request Service
// ==========================
document.getElementById("request-service-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const service = document.getElementById("service").value;
  const serviceProvider = await autoAssignServiceProvider();

  const docRef = await addDoc(collection(db, "services"), {
    serviceName: service,
    requestedBy: userId,
    assignedTo: serviceProvider,
    status: "Assigned"
  });

  latestServiceId = docRef.id;
  alert("Service Requested and Assigned!");
  location.reload();
});

async function autoAssignServiceProvider() {
  const q = query(collection(db, "users"), where("role", "==", "service_provider"));
  const providers = await getDocs(q);

  if (!providers.empty) {
    return providers.docs[0].id;
  }
  alert("No service provider available.");
  return null;
}

// ==========================
// ✅ Section 3: Track Service
// ==========================
async function loadUserServices() {
  const q = query(collection(db, "services"), where("requestedBy", "==", userId));
  const querySnapshot = await getDocs(q);

  const serviceContainer = document.getElementById("assigned-service");
  serviceContainer.innerHTML = "";

  if (querySnapshot.empty) {
    serviceContainer.innerHTML = `<p>No services requested yet.</p>`;
    return;
  }

  querySnapshot.forEach(async (docSnap) => {
    const data = docSnap.data();
    let providerProfile = "Not Assigned";

    if (data.assignedTo) {
      const providerDoc = await getDoc(doc(db, "users", data.assignedTo));
      if (providerDoc.exists()) {
        providerProfile = providerDoc.data().username;
      }
    }

    serviceContainer.innerHTML += `
      <div style="border:1px solid #ccc; padding:10px; margin-bottom:10px;">
        <p><b>Service:</b> ${data.serviceName}</p>
        <p><b>Status:</b> ${data.status}</p>
        <p><b>Service Provider:</b> ${providerProfile}</p>
        <button onclick="window.location.href='profile.html?id=${data.assignedTo}'">View Provider Profile</button>
        <button onclick="window.location.href='profile.html?id=${userId}'">View Your Profile</button>
        <button onclick="cancelService('${docSnap.id}')">Cancel Service</button>
      </div>
    `;

    if (data.status === "Completed") {
      document.getElementById("section-4").classList.remove("hidden");
      latestServiceId = docSnap.id;
    }
  });
}

window.cancelService = async (serviceId) => {
  await updateDoc(doc(db, "services", serviceId), { status: "Cancelled" });
  alert("Service Cancelled!");
  location.reload();
};

// ==========================
// ✅ Section 4: Feedback
// ==========================
document.getElementById("feedback-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const rating = document.getElementById("rating").value;
  const feedback = document.getElementById("feedback").value;

  await updateDoc(doc(db, "services", latestServiceId), {
    feedback,
    rating,
    status: "Closed"
  });

  alert("Feedback Submitted!");
  location.reload();
});

// ✅ Section 1: Check Subscription & Update UI
async function checkSubscription() {
  const subDoc = await getDoc(doc(db, "subscriptions", userId));

  if (subDoc.exists()) {
    const data = subDoc.data();
    subscriptionPlan = data.plan;
    remainingRequests = data.remainingRequests;
    subscriptionStatus = data.status || "Active"; // Default to Active

    document.getElementById("plan").innerText = `Current Plan: ${subscriptionPlan}`;
    document.getElementById("remaining-requests").innerText = `Remaining Requests: ${remainingRequests}`;

    // 🚀 Show correct button based on subscription status
    if (subscriptionStatus === "Pending") {
      document.getElementById("upgrade-btn").innerText = "Pending Approval";
      document.getElementById("upgrade-btn").disabled = true;
    } else if (subscriptionPlan === "Gold") {
      document.getElementById("upgrade-btn").innerText = "Gold Plan Active";
      document.getElementById("upgrade-btn").disabled = true;
    }
  } else {
    // 🚀 If no subscription, assign Free Plan
    await setDoc(doc(db, "subscriptions", userId), {
      plan: "Free",
      remainingRequests: 5,
      status: "Active"
    });
    location.reload();
  }
}

// ✅ Section 2: Request Gold Plan (Admin Approval Needed)
document.getElementById("upgrade-btn").addEventListener("click", async () => {
  await setDoc(doc(db, "subscriptions", userId), {
    plan: "Gold",
    remainingRequests: 35,
    status: "Pending"
  });

  alert("Gold Plan Upgrade Requested. Waiting for Admin Approval.");
  location.reload();
});

        
