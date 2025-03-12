import { auth, db } from "./firebase.js";
import {
  doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let userId;
let latestServiceId = null;
let subscriptionPlan = "Free";
let remainingRequests = 5;
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
  await checkSubscriptionExpiry(); // ✅ Ensure subscription expiry is checked
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

// ✅ Check Subscription Expiry & Deactivate If Needed
async function checkSubscriptionExpiry() {
  const subDoc = await getDoc(doc(db, "subscriptions", userId));

  if (subDoc.exists()) {
    const data = subDoc.data();
    const subscribedDate = data.subscribedDate;
    const currentDate = new Date();

    if (subscribedDate) {
      const subscriptionEndDate = new Date(subscribedDate);
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

      if (currentDate >= subscriptionEndDate) {
        // 🚀 Subscription has expired, downgrade to Free plan
        await updateDoc(doc(db, "subscriptions", userId), {
          plan: "Free",
          remainingRequests: 5,
          status: "Expired"
        });

        alert("Your Gold subscription has expired. You have been downgraded to Free plan.");
        location.reload();
      }
    }
  }
}

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
      remainingRequests: 5,
      status: "Active"
    });
    location.reload();
  }
}

// ✅ Request Gold Plan (Admin Approval Needed)
window.requestGoldPlan = async () => {
  const currentDate = new Date().toISOString(); // Get current date

  await setDoc(doc(db, "subscriptions", userId), {
    plan: "Gold",
    remainingRequests: 35,
    status: "Pending",
    subscribedDate: currentDate // ✅ Save subscription start date
  });

  alert("Gold Plan Upgrade Requested. Waiting for Admin Approval.");
  location.reload();
};

// ✅ Request Service & Reduce Limit
document.getElementById("request-service-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (subscriptionStatus === "Pending") {
    alert("Your subscription upgrade is pending approval. Please wait for admin approval before requesting a service.");
    return;
  }

  if (remainingRequests <= 0) {
    alert("Request limit reached. Upgrade to Gold.");
    return;
  }

  const service = document.getElementById("service").value;
  const serviceProvider = await autoAssignServiceProvider();

  if (!serviceProvider) {
    alert("No available service providers. Try again later.");
    return;
  }

  const docRef = await addDoc(collection(db, "services"), {
    serviceName: service,
    requestedBy: userId,
    assignedTo: serviceProvider,
    status: "Assigned"
  });

  latestServiceId = docRef.id;

  // 🚀 Reduce Remaining Requests
  await updateDoc(doc(db, "subscriptions", userId), {
    remainingRequests: remainingRequests - 1
  });

  alert("Service Requested and Assigned!");
  location.reload();
});

// ✅ Load User Services
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
        <button onclick="cancelService('${docSnap.id}')">Cancel Service</button>
        ${data.status === "Completed" ? `<button onclick="openFeedbackForm('${docSnap.id}')">Give Feedback</button>` : ""}
      </div>
    `;

    if (data.status === "Completed") {
      document.getElementById("section-4").classList.remove("hidden");
    }
  });
}

// ✅ Cancel Service
window.cancelService = async (serviceId) => {
  await updateDoc(doc(db, "services", serviceId), { status: "Cancelled" });
  alert("Service Cancelled!");
  location.reload();
};

// ✅ Open Feedback Form & Set latestServiceId
window.openFeedbackForm = (serviceId) => {
  latestServiceId = serviceId;
};

// ✅ Submit Feedback (Fixed)
document.getElementById("feedback-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!latestServiceId) {
    alert("Please select a completed service to give feedback.");
    return;
  }

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
