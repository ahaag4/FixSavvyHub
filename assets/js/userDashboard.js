import { auth, db } from "./firebase.js";
import {
  doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let userId;
let subscriptionPlan;
let remainingRequests;
let subscriptionStatus;

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

// ✅ Section 1: Load Profile
async function loadUserProfile() {
  const userDoc = await getDoc(doc(db, "users", userId));

  if (userDoc.exists()) {
    const userData = userDoc.data();
    document.getElementById("username").innerText = userData.username;
    document.getElementById("phone").innerText = userData.phone;
    document.getElementById("address").innerText = userData.address;
  }
}

// ✅ Section 2: Check Subscription
async function checkSubscription() {
  const userDoc = await getDoc(doc(db, "subscriptions", userId));
  if (userDoc.exists()) {
    const data = userDoc.data();
    subscriptionPlan = data.plan;
    remainingRequests = data.remainingRequests;
    subscriptionStatus = data.status;

    document.getElementById("subscription").innerText = subscriptionPlan;
    document.getElementById("remaining-requests").innerText = remainingRequests;

    if (subscriptionStatus === "expired") {
      alert("Your subscription has expired. Please renew.");
    }
  } else {
    document.getElementById("subscription-section").classList.remove("hidden");
  }
}

// ✅ Section 3: Request Service
document.getElementById("request-service-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (subscriptionStatus === "expired") {
    alert("Your subscription expired. Please renew.");
    return;
  }
  if (remainingRequests <= 0 && subscriptionPlan !== "Premium") {
    alert("Request limit reached. Upgrade to Premium.");
    return;
  }

  const service = document.getElementById("service").value;
  const provider = await autoAssignServiceProvider();

  if (!provider) {
    alert("No service provider available.");
    return;
  }

  await addDoc(collection(db, "services"), {
    serviceName: service,
    requestedBy: userId,
    assignedTo: provider,
    status: "Assigned"
  });

  await updateDoc(doc(db, "subscriptions", userId), {
    remainingRequests: remainingRequests - 1
  });

  alert("Service Requested!");
  location.reload();
});

// ✅ Section 4: Auto Assign Service Provider (Sponsored First)
async function autoAssignServiceProvider() {
  const q = query(collection(db, "users"), where("role", "==", "service_provider"));
  const providers = await getDocs(q);

  let sponsoredProviders = [];
  let regularProviders = [];

  providers.forEach(doc => {
    if (doc.data().isSponsored) {
      sponsoredProviders.push(doc.id);
    } else {
      regularProviders.push(doc.id);
    }
  });

  if (sponsoredProviders.length > 0) return sponsoredProviders[0];
  if (regularProviders.length > 0) return regularProviders[0];

  return null;
}

// ✅ Section 5: Load Services
async function loadUserServices() {
  const q = query(collection(db, "services"), where("requestedBy", "==", userId));
  const querySnapshot = await getDocs(q);

  const container = document.getElementById("user-services");
  container.innerHTML = "";

  querySnapshot.forEach(docSnap => {
    const data = docSnap.data();
    container.innerHTML += `
      <p><b>Service:</b> ${data.serviceName}</p>
      <p><b>Status:</b> ${data.status}</p>
    `;
  });
}

// ✅ Section 6: Subscribe Plan
window.subscribePlan = async (plan) => {
  const amount = plan === "Basic" ? 299 : 599;
  const requests = plan === "Basic" ? 5 : Infinity;

  const paymentId = `pay_${Date.now()}`;
  await setDoc(doc(db, "subscriptions", userId), {
    plan: plan,
    paymentId: paymentId,
    remainingRequests: requests,
    status: "active"
  });

  alert("Subscription Activated!");
  location.reload();
};
