import { auth, db } from "./firebase.js";
import {
  doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let userId;
let latestServiceId = null; // Set to null initially
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
  await checkSubscriptionExpiry();  // ✅ Check and expire subscription if needed
  await loadUserProfile();
  await checkSubscription();
  await loadUserServices();
});

// ✅ Function to Check & Expire Subscription
async function checkSubscriptionExpiry() {
  const subDoc = await getDoc(doc(db, "subscriptions", userId));

  if (subDoc.exists()) {
    const data = subDoc.data();
    const subscribedDate = data.subscribedDate; // Subscription start date
    const currentDate = new Date();

    if (subscribedDate) {
      const subscriptionEndDate = new Date(subscribedDate);
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1); // Add 1 month

      if (currentDate >= subscriptionEndDate) {
        // ✅ Subscription expired, downgrade to Free plan
        await updateDoc(doc(db, "subscriptions", userId), {
          plan: "Free",
          remainingRequests: 1,  // Free plan users get 1 request per month
          status: "Expired"
        });

        alert("Your Gold subscription has expired. You have been downgraded to the Free plan.");
        location.reload();
      }
    }
  }
}

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
    status: "Pending",
    subscribedDate: new Date().toISOString()  // Store start date of Gold subscription
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


// ✅ Enhanced Auto Assign Best Service Provider
async function autoAssignServiceProvider(userId) {
  const serviceType = document.getElementById("service").value.toLowerCase().trim();
  if (!serviceType) throw new Error("Service type is required");

  const userRef = await getDoc(doc(db, "users", userId));
  if (!userRef.exists()) throw new Error("User not found");
  const userData = userRef.data();
  const userSubDistrict = userData.subDistrict || "Unknown Sub-District";
  const userDistrict = userData.district || "Unknown District";

  let providers = await findProviders(serviceType, userSubDistrict);
  if (providers.length === 0) {
    console.log(`No providers in ${userSubDistrict}. Searching in ${userDistrict}...`);
    providers = await findProviders(serviceType, userDistrict);
  }

  if (providers.length > 0) {
    const bestProvider = providers
      .filter(p => p.availability === "Available" && p.activeRequests < 10)
      .sort((a, b) => {
        const scoreA = (b.rating * 10 + b.completedJobs) - (a.rating * 10 + a.completedJobs);
        const loadA = a.activeRequests - b.activeRequests;
        const seniorityA = new Date(a.signupDate) - new Date(b.signupDate);
        return scoreA || loadA || seniorityA;
      })[0];
    return bestProvider ? bestProvider.id : null;
  }

  const newProvider = await findServiceProviderEnhanced(serviceType, userSubDistrict, userDistrict);
  return newProvider ? newProvider.id : null;
}

// ✅ Enhanced External API Search with More APIs
async function findServiceProviderEnhanced(serviceType, subDistrict, district) {
  const apis = [
    { fn: findServiceProviderOSM, name: "OpenStreetMap" },
    { fn: findServiceProviderYelp, name: "Yelp" },
    { fn: findServiceProviderGoogle, name: "Google Places" },
    { fn: findServiceProviderFoursquare, name: "Foursquare" },
    { fn: findServiceProviderHere, name: "Here Maps" }, // New API
    { fn: findServiceProviderMapQuest, name: "MapQuest" } // New API
  ];

  for (const api of apis) {
    try {
      const provider = await retry(api.fn, 2, 1000)(serviceType, subDistrict || district);
      if (provider) return provider;
      console.log(`No providers found via ${api.name}. Trying next...`);
    } catch (error) {
      console.error(`${api.name} API Error:`, error);
    }
  }
  alert("No service providers found across all APIs.");
  return null;
}

// ✅ Retry Logic for API Calls
function retry(fn, retries = 3, delay = 500) {
  return async (...args) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn(...args);
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  };
}

// ✅ OSM Provider Search
async function findServiceProviderOSM(serviceType, location) {
  const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${serviceType} in ${location}`)}&limit=1&extratags=1`;
  const response = await fetch(osmUrl, { headers: { "User-Agent": "AutoAssign/1.0" } });
  const data = await response.json();
  if (!data.length) return null;
  return await storeNewProvider(data[0], serviceType, location);
}

// ✅ Yelp Provider Search
async function findServiceProviderYelp(serviceType, location) {
  const yelpUrl = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(serviceType)}&location=${encodeURIComponent(location)}&limit=1`;
  const response = await fetch(yelpUrl, {
    headers: { "Authorization": "Bearer YOUR_YELP_API_KEY" }
  });
  const data = await response.json();
  if (!data.businesses?.length) return null;
  return await storeNewProvider(data.businesses[0], serviceType, location);
}

// ✅ Google Places Provider Search
async function findServiceProviderGoogle(serviceType, location) {
  const googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(`${serviceType} in ${location}`)}&key=YOUR_GOOGLE_API_KEY`;
  const response = await fetch(googleUrl);
  const data = await response.json();
  if (!data.results?.length) return null;
  return await storeNewProvider(data.results[0], serviceType, location);
}

// ✅ Foursquare Provider Search
async function findServiceProviderFoursquare(serviceType, location) {
  const foursquareUrl = `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(serviceType)}&near=${encodeURIComponent(location)}&limit=1`;
  const response = await fetch(foursquareUrl, {
    headers: { "Authorization": "fsq3zz12Qn2PtWIQM1J5Vz+da3Q/SzGR9H9X+W3IjMPYFZo=" }
  });
  const data = await response.json();
  if (!data.results?.length) return null;
  return await storeNewProvider(data.results[0], serviceType, location);
}

// ✅ Here Maps Provider Search (New API)
async function findServiceProviderHere(serviceType, location) {
  const hereUrl = `https://discover.search.hereapi.com/v1/discover?at=0,0&q=${encodeURIComponent(`${serviceType} in ${location}`)}&limit=1&apiKey=YOUR_HERE_API_KEY`;
  const response = await fetch(hereUrl);
  const data = await response.json();
  if (!data.items?.length) return null;
  return await storeNewProvider(data.items[0], serviceType, location);
}

// ✅ MapQuest Provider Search (New API)
async function findServiceProviderMapQuest(serviceType, location) {
  const mapquestUrl = `https://www.mapquestapi.com/search/v2/search?key=YOUR_MAPQUEST_API_KEY&query=${encodeURIComponent(`${serviceType} in ${location}`)}&maxMatches=1`;
  const response = await fetch(mapquestUrl);
  const data = await response.json();
  if (!data.searchResults?.length) return null;
  return await storeNewProvider(data.searchResults[0], serviceType, location);
}

// ✅ Store New Provider with Enhanced Data Normalization
async function storeNewProvider(providerData, serviceType, location) {
  const provider = {
    name: providerData.name || providerData.display_name?.split(",")[0] || providerData.title || "Unnamed Provider",
    address: providerData.address || providerData.location?.formatted_address || providerData.position || "Unknown",
    phone: providerData.phone || providerData.extratags?.phone || providerData.contact?.phone || "N/A",
    website: providerData.website || providerData.url || providerData.extratags?.website || "N/A",
    role: "service_provider",
    service: serviceType,
    subDistrict: location.includes("Unknown") ? null : location,
    rating: providerData.rating ? Math.min(parseFloat(providerData.rating), 5) : 0,
    completedJobs: 0,
    availability: "Available",
    activeRequests: 0,
    signupDate: new Date().toISOString()
  };

  const docRef = await addDoc(collection(db, "users"), provider);
  provider.id = docRef.id;
  alert(`New provider added: ${provider.name}`);
  return provider;
}

// ✅ Enhanced Provider Search in Firestore
async function findProviders(serviceType, location) {
  const q = query(
    collection(db, "users"),
    where("role", "==", "service_provider"),
    where("subDistrict", "==", location)
  );

  const providersSnapshot = await getDocs(q);
  const providers = [];

  providersSnapshot.forEach(docSnap => {
    const provider = docSnap.data();
    const providerService = provider.service.toLowerCase().trim();
    if (fuzzyMatch(providerService, serviceType)) {
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

// ✅ Enhanced Fuzzy Matching
function fuzzyMatch(a, b) {
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  return a.includes(b) || b.includes(a) || levenshteinDistance(a, b) <= Math.max(2, Math.min(a.length, b.length) * 0.2);
}

// ✅ Optimized Levenshtein Distance
function levenshteinDistance(s1, s2) {
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;

  const dp = Array(2).fill().map(() => Array(s1.length + 1).fill(0));
  for (let j = 0; j <= s1.length; j++) dp[0][j] = j;

  for (let i = 1; i <= s2.length; i++) {
    dp[i % 2][0] = i;
    for (let j = 1; j <= s1.length; j++) {
      dp[i % 2][j] = Math.min(
        dp[(i - 1) % 2][j] + 1,
        dp[i % 2][j - 1] + 1,
        dp[(i - 1) % 2][j - 1] + (s1[j - 1] === s2[i - 1] ? 0 : 1)
      );
    }
  }
  return dp[s2.length % 2][s1.length];
}






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

    // ✅ Generate service card with "Give Feedback" button for completed services
    serviceContainer.innerHTML += `
      <div style="border:1px solid #ccc; padding:10px; margin-bottom:10px;">
        <p><b>Service:</b> ${data.serviceName}</p>
        <p><b>Status:</b> ${data.status}</p>
        <p><b>Service Provider:</b> ${providerProfile}</p>
        <button onclick="window.location.href='profile.html?id=${data.assignedTo}'">View Provider Profile</button>
        <button onclick="window.location.href='profile.html?id=${userId}'">View Your Profile</button>
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
  alert(`Feedback enabled for service: ${latestServiceId}`);
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

    
