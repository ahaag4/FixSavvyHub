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


// ✅ Function to Auto Assign Best Service Provider
async function autoAssignServiceProvider() {
  let serviceType = document.getElementById("service").value.toLowerCase().trim();

  // ✅ Get User's Sub-District
  const userRef = await getDoc(doc(db, "users", userId));
  if (!userRef.exists()) return null;
  const userSubDistrict = userRef.data().subDistrict;
  const userDistrict = userRef.data().district; // Assuming district is also available

  // ✅ Check Firestore for Providers in Sub-District
  let providers = await findProviders(serviceType, userSubDistrict);

  // ✅ If no providers found, search in the District
  if (providers.length === 0) {
    console.log("No providers found in sub-district. Searching in district...");
    providers = await findProviders(serviceType, userDistrict);
  }

  // ✅ If Providers are found, sort and return the best one
  if (providers.length > 0) {
    let bestProvider = providers
      .sort((a, b) => 
        (b.rating + b.completedJobs) - (a.rating + a.completedJobs) ||
        a.activeRequests - b.activeRequests ||
        new Date(a.signupDate) - new Date(b.signupDate)
      )
      .find(provider => provider.availability === "Available");

    return bestProvider ? bestProvider.id : null;
  }

  // ✅ **If No Provider Found, Search External APIs**
  let newProvider = await findServiceProviderEnhanced(serviceType, userSubDistrict);
  if (newProvider) {
    return newProvider.id; // Return newly added provider's ID
  }
  return null;
}

// ✅ **Find Service Provider using OpenStreetMap + Yelp + Google + Foursquare**
async function findServiceProviderEnhanced(serviceType, userSubDistrict) {
  let osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${serviceType} in ${userSubDistrict}&extratags=1`;
  
  try {
    let response = await fetch(osmUrl);
    let data = await response.json();

    if (data.length === 0) {
      console.log("No providers found via OSM. Trying Yelp...");
      return await findServiceProviderYelp(serviceType, userSubDistrict);
    }

    let provider = await storeNewProvider(data[0], serviceType, userSubDistrict);
    return provider;
  
  } catch (error) {
    console.error("OSM API Error:", error);
    return await findServiceProviderYelp(serviceType, userSubDistrict);
  }
}

// ✅ **Find Service Provider using Yelp API**
async function findServiceProviderYelp(serviceType, userSubDistrict) {
  let yelpUrl = `https://api.yelp.com/v3/businesses/search?term=${serviceType}&location=${userSubDistrict}&limit=1`;
  
  try {
    let response = await fetch(yelpUrl, {
      headers: {
        "Authorization": `Bearer YOUR_YELP_API_KEY` 
      }
    });

    let data = await response.json();
    if (data.businesses.length === 0) {
      console.log("No service providers found via Yelp. Trying Google...");
      return await findServiceProviderGoogle(serviceType, userSubDistrict);
    }

    let provider = await storeNewProvider(data.businesses[0], serviceType, userSubDistrict);
    return provider;

  } catch (error) {
    console.error("Yelp API Error:", error);
    return await findServiceProviderGoogle(serviceType, userSubDistrict);
  }
}

// ✅ **Find Service Provider using Google Places API**
async function findServiceProviderGoogle(serviceType, userSubDistrict) {
  let googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${serviceType}+in+${userSubDistrict}&key=YOUR_GOOGLE_API_KEY`;
  
  try {
    let response = await fetch(googleUrl);
    let data = await response.json();

    if (!data.results.length) {
      console.log("No service providers found via Google. Trying Foursquare...");
      return await findServiceProviderFoursquare(serviceType, userSubDistrict);
    }

    let provider = await storeNewProvider(data.results[0], serviceType, userSubDistrict);
    return provider;

  } catch (error) {
    console.error("Google API Error:", error);
    return await findServiceProviderFoursquare(serviceType, userSubDistrict);
  }
}

// ✅ **Find Service Provider using Foursquare API**
async function findServiceProviderFoursquare(serviceType, userSubDistrict) {
  let foursquareUrl = `https://api.foursquare.com/v3/places/search?query=${serviceType}&near=${userSubDistrict}`;
  
  try {
    let response = await fetch(foursquareUrl, {
      headers: { "Authorization": "fsq3zz12Qn2PtWIQM1J5Vz+da3Q/SzGR9H9X+W3IjMPYFZo=" }
    });

    let data = await response.json();
    if (!data.results.length) {
      alert("No service providers found via Foursquare either.");
      return null;
    }

    let provider = await storeNewProvider(data.results[0], serviceType, userSubDistrict);
    return provider;

  } catch (error) {
    console.error("Foursquare API Error:", error);
    return null;
  }
}

// ✅ **Store New Provider in Firestore**
async function storeNewProvider(providerData, serviceType, userSubDistrict) {
  let provider = {
    name: providerData.name || providerData.display_name.split(",")[0],
    address: providerData.address || providerData.location?.formatted_address || "Unknown Address",
    phone: providerData.phone || providerData.extratags?.phone || "Not Available",
    website: providerData.website || providerData.url || providerData.extratags?.website || "Not Available",
    role: "service_provider",
    service: serviceType,
    subDistrict: userSubDistrict,
    rating: providerData.rating || 0,
    completedJobs: 0,
    availability: "Available",
    activeRequests: 0,
    signupDate: new Date().toISOString()
  };

  const docRef = await addDoc(collection(db, "users"), provider);
  provider.id = docRef.id;

  alert(`New service provider added: ${provider.name}`);
  return provider;
}

// ✅ **Find Providers from Firestore with Improved Matching**
async function findProviders(serviceType, location) {
  const q = query(collection(db, "users"),
    where("role", "==", "service_provider"),
    where("subDistrict", "==", location)
  );

  const providersSnapshot = await getDocs(q);
  let providers = [];
  
  if (!providersSnapshot.empty) {
    providersSnapshot.forEach(docSnap => {
      const provider = docSnap.data();
      let providerService = provider.service.toLowerCase().trim();

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
  }
  return providers;
}

// ✅ **Fuzzy Matching using Levenshtein Distance**
function fuzzyMatch(a, b) {
  return a.includes(b) || b.includes(a) || levenshteinDistance(a, b) <= 2;
}

// ✅ **Levenshtein Distance Calculation**
function levenshteinDistance(s1, s2) {
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

    
