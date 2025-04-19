import { auth, db } from "./firebase.js";
import {
  doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Cache DOM elements
const DOM = {
  username: document.getElementById("username"),
  phone: document.getElementById("phone"),
  address: document.getElementById("address"),
  service: document.getElementById("service"),
  plan: document.getElementById("plan"),
  remainingRequests: document.getElementById("remaining-requests"),
  upgradeBtn: document.getElementById("upgrade-btn"),
  profileForm: document.getElementById("profile-form"),
  requestServiceForm: document.getElementById("request-service-form"),
  feedbackForm: document.getElementById("feedback-form"),
  serviceContainer: document.getElementById("assigned-service"),
  sections: {
    section1: document.getElementById("section-1"),
    section2: document.getElementById("section-2"),
    section3: document.getElementById("section-3"),
    section4: document.getElementById("section-4"),
    section5: document.getElementById("section-5")
  }
};

// Global state
const state = {
  userId: null,
  latestServiceId: null,
  subscriptionPlan: "Free",
  remainingRequests: 1,
  subscriptionStatus: "Active",
  cachedProviders: new Map() // Cache for providers
};

// ✅ Initialize Application
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("You are not signed in. Redirecting...");
    window.location.href = "signin.html";
    return;
  }

  state.userId = user.uid;
  await initializeApp();
});

async function initializeApp() {
  await Promise.all([
    checkSubscriptionExpiry(),
    loadUserProfile(),
    checkSubscription(),
    loadUserServices()
  ]);
}

// ✅ Check & Expire Subscription
async function checkSubscriptionExpiry() {
  const subDoc = await getDoc(doc(db, "subscriptions", state.userId));

  if (subDoc.exists()) {
    const data = subDoc.data();
    const subscribedDate = data.subscribedDate;
    const currentDate = new Date();

    if (subscribedDate) {
      const subscriptionEndDate = new Date(subscribedDate);
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

      if (currentDate >= subscriptionEndDate) {
        await updateDoc(doc(db, "subscriptions", state.userId), {
          plan: "Free",
          remainingRequests: 1,
          status: "Expired"
        });
        alert("Your Gold subscription has expired. Downgraded to Free plan.");
        location.reload();
      }
    }
  }
}

// ✅ Load User Profile
async function loadUserProfile() {
  const userDoc = await getDoc(doc(db, "users", state.userId));

  if (userDoc.exists()) {
    const userData = userDoc.data();
    DOM.username.value = userData.username || "";
    DOM.phone.value = userData.phone || "";
    DOM.address.value = userData.address || "";

    if (userData.phone && userData.address) {
      DOM.sections.section1.classList.add("hidden");
      DOM.sections.section2.classList.remove("hidden");
      DOM.sections.section3.classList.remove("hidden");
      DOM.sections.section5.classList.remove("hidden");
    }
  }
}

// ✅ Check Subscription & Update UI
async function checkSubscription() {
  const subDoc = await getDoc(doc(db, "subscriptions", state.userId));

  if (subDoc.exists()) {
    const data = subDoc.data();
    state.subscriptionPlan = data.plan;
    state.remainingRequests = data.remainingRequests;
    state.subscriptionStatus = data.status || "Active";

    DOM.plan.textContent = `Current Plan: ${state.subscriptionPlan}`;
    DOM.remainingRequests.textContent = `Remaining Requests: ${state.remainingRequests}`;

    if (DOM.upgradeBtn) {
      if (state.subscriptionStatus === "Pending") {
        DOM.upgradeBtn.textContent = "Pending Approval";
        DOM.upgradeBtn.disabled = true;
      } else if (state.subscriptionPlan === "Gold") {
        DOM.upgradeBtn.textContent = "Gold Plan Active";
        DOM.upgradeBtn.disabled = true;
      } else {
        DOM.upgradeBtn.textContent = "Upgrade to Gold (₹199/month)";
        DOM.upgradeBtn.disabled = false;
      }
    }
  } else {
    await setDoc(doc(db, "subscriptions", state.userId), {
      plan: "Free",
      remainingRequests: 1,
      status: "Active"
    });
    location.reload();
  }
}

// ✅ Event Listeners
function setupEventListeners() {
  DOM.profileForm?.addEventListener("submit", handleProfileSubmit);
  DOM.requestServiceForm?.addEventListener("submit", handleServiceRequest);
  DOM.feedbackForm?.addEventListener("submit", handleFeedbackSubmit);
}

async function handleProfileSubmit(e) {
  e.preventDefault();
  await setDoc(doc(db, "users", state.userId), {
    username: DOM.username.value,
    phone: DOM.phone.value,
    address: DOM.address.value,
    role: "user"
  }, { merge: true });
  alert("Profile Updated!");
  location.reload();
}

async function handleServiceRequest(e) {
  e.preventDefault();

  if (state.subscriptionStatus === "Pending") {
    alert("Your subscription upgrade is pending approval.");
    return;
  }

  if (state.remainingRequests <= 0) {
    alert("Request limit reached. Upgrade to Gold.");
    return;
  }

  const serviceProvider = await autoAssignServiceProvider();
  if (!serviceProvider) {
    alert("No available service providers. Try again later.");
    return;
  }

  const docRef = await addDoc(collection(db, "services"), {
    serviceName: DOM.service.value,
    requestedBy: state.userId,
    assignedTo: serviceProvider,
    status: "Assigned",
    createdAt: new Date().toISOString()
  });

  state.latestServiceId = docRef.id;

  await updateDoc(doc(db, "subscriptions", state.userId), {
    remainingRequests: state.remainingRequests - 1
  });

  alert("Service Requested and Assigned!");
  location.reload();
}

async function handleFeedbackSubmit(e) {
  e.preventDefault();
  
  if (!state.latestServiceId) {
    alert("Please select a completed service to give feedback.");
    return;
  }

  await updateDoc(doc(db, "services", state.latestServiceId), {
    feedback: DOM.feedbackForm.feedback.value,
    rating: DOM.feedbackForm.rating.value,
    status: "Closed"
  });

  alert("Feedback Submitted!");
  location.reload();
}

// ✅ Request Gold Plan with Redirection
window.requestGoldPlan = async () => {
  await setDoc(doc(db, "subscriptions", state.userId), {
    plan: "Gold",
    remainingRequests: 35,
    status: "Pending",
    subscribedDate: new Date().toISOString()
  });

  // Redirect to payment/confirmation page
  window.location.href = "https://youasitube.blogspot.com/p/buy-our-course-learn-everything-you.html?m=1";
};

// ✅ Optimized Auto Assign Service Provider
async function autoAssignServiceProvider() {
  const serviceType = DOM.service.value.toLowerCase().trim();
  const userDoc = await getDoc(doc(db, "users", state.userId));
  
  if (!userDoc.exists()) return null;

  const { subDistrict, district, city, state: userState } = userDoc.data();
  const locations = [subDistrict, district, city, userState].filter(Boolean);

  // Try cached providers first
  for (const location of locations) {
    const cacheKey = `${serviceType}-${location}`;
    if (state.cachedProviders.has(cacheKey)) {
      const providers = state.cachedProviders.get(cacheKey);
      const bestProvider = findBestProvider(providers);
      if (bestProvider) return bestProvider.id;
    }
  }

  // Search in database
  for (const location of locations) {
    const providers = await findProviders(serviceType, location);
    if (providers.length > 0) {
      const cacheKey = `${serviceType}-${location}`;
      state.cachedProviders.set(cacheKey, providers);
      const bestProvider = findBestProvider(providers);
      if (bestProvider) return bestProvider.id;
    }
  }

  // Fallback to external APIs
  console.log("No local providers found. Searching external APIs...");
  const newProvider = await findServiceProviderEnhanced(serviceType, ...locations);
  return newProvider?.id;
}

function findBestProvider(providers) {
  return providers
    .sort((a, b) => 
      (b.rating + b.completedJobs) - (a.rating + a.completedJobs) ||
      a.activeRequests - b.activeRequests ||
      new Date(a.signupDate) - new Date(b.signupDate)
    .find(p => p.availability === "Available");
}

// ✅ Optimized Find Providers
async function findProviders(serviceType, location) {
  const q = query(
    collection(db, "users"),
    where("role", "==", "service_provider"),
    where("subDistrict", "==", location),
    where("availability", "==", "Available")
  );

  const snapshot = await getDocs(q);
  const providers = [];

  snapshot.forEach(docSnap => {
    const provider = docSnap.data();
    if (fuzzyMatch(provider.service.toLowerCase(), serviceType)) {
      providers.push({
        id: docSnap.id,
        rating: provider.rating || 0,
        completedJobs: provider.completedJobs || 0,
        availability: provider.availability || "Available",
        activeRequests: provider.activeRequests || 0,
        signupDate: provider.signupDate || "9999-12-31"
      });
    }
  });

  return providers;
}

// ✅ Load User Services with Pagination
async function loadUserServices() {
  const q = query(
    collection(db, "services"),
    where("requestedBy", "==", state.userId),
    orderBy("createdAt", "desc"),
    limit(5)
  );

  const snapshot = await getDocs(q);
  DOM.serviceContainer.innerHTML = "";

  if (snapshot.empty) {
    DOM.serviceContainer.innerHTML = `<p>No services requested yet.</p>`;
    return;
  }

  const providerPromises = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    let providerProfile = "Not Assigned";

    if (data.assignedTo) {
      providerPromises.push(
        getDoc(doc(db, "users", data.assignedTo)).then(providerDoc => {
          if (providerDoc.exists()) {
            providerProfile = providerDoc.data().username;
          }
          return { data, providerProfile, id: docSnap.id };
        })
      );
    } else {
      providerPromises.push(Promise.resolve({ data, providerProfile, id: docSnap.id }));
    }
  });

  const services = await Promise.all(providerPromises);
  services.forEach(({ data, providerProfile, id }) => {
    DOM.serviceContainer.innerHTML += createServiceCard(data, providerProfile, id);
    if (data.status === "Completed") {
      DOM.sections.section4.classList.remove("hidden");
    }
  });
}

function createServiceCard(data, providerProfile, id) {
  return `
    <div class="service-card">
      <p><b>Service:</b> ${data.serviceName}</p>
      <p><b>Status:</b> ${data.status}</p>
      <p><b>Provider:</b> ${providerProfile}</p>
      <div class="button-group">
        <button onclick="window.location.href='profile.html?id=${data.assignedTo}'">View Provider</button>
        <button onclick="window.location.href='profile.html?id=${state.userId}'">Your Profile</button>
        <button onclick="cancelService('${id}')">Cancel</button>
        ${data.status === "Completed" ? `<button onclick="openFeedbackForm('${id}')">Feedback</button>` : ""}
      </div>
    </div>
  `;
}

// ✅ Cancel Service
window.cancelService = async (serviceId) => {
  await updateDoc(doc(db, "services", serviceId), { status: "Cancelled" });
  alert("Service Cancelled!");
  location.reload();
};

// ✅ Open Feedback Form
window.openFeedbackForm = (serviceId) => {
  state.latestServiceId = serviceId;
  DOM.feedbackForm.classList.remove("hidden");
};

// Helper functions (fuzzyMatch, levenshteinDistance, etc. remain the same)
function fuzzyMatch(a, b) {
  return a.includes(b) || b.includes(a) || levenshteinDistance(a, b) <= 2;
}

function levenshteinDistance(s1, s2) {
  if (!s1 || !s2) return Infinity;
  const dp = Array(s2.length + 1).fill().map(() => Array(s1.length + 1).fill(0));
  for (let i = 0; i <= s2.length; i++) dp[i][0] = i;
  for (let j = 0; j <= s1.length; j++) dp[0][j] = j;

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (s1[j - 1] === s2[i - 1] ? 0 : 1)
      );
    }
  }
  return dp[s2.length][s1.length];
}

// Initialize
setupEventListeners();
