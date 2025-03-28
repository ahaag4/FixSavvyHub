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
  console.log("🔍 Searching for:", serviceType);

  // ✅ Get User's District & Sub-District
  const userRef = await getDoc(doc(db, "users", userId));
  if (!userRef.exists()) return console.log("❌ User not found in Firestore");

  const userDistrict = userRef.data().district;
  const userSubDistrict = userRef.data().subDistrict;
  console.log(`📍 User Location: ${userSubDistrict}, ${userDistrict}`);

  // ✅ Search Firestore for Providers
  const q = query(collection(db, "users"),
    where("role", "==", "service_provider"),
    where("district", "==", userDistrict),
    where("subDistrict", "==", userSubDistrict)
  );

  const providersSnapshot = await getDocs(q);
  console.log(`📊 Firestore Providers Found: ${providersSnapshot.size}`);

  if (!providersSnapshot.empty) {
    let providers = [];
    providersSnapshot.forEach(docSnap => {
      const provider = docSnap.data();
      console.log("🛠 Checking Firestore Provider:", provider);

      let providerService = provider.service.toLowerCase().trim();
      if (providerService.includes(serviceType) || serviceType.includes(providerService)) {
        providers.push({
          id: docSnap.id,
          name: provider.name,
          phone: provider.phone,
          address: provider.address,
          rating: provider.rating || 0,
          completedJobs: provider.completedJobs || 0,
          availability: provider.availability || "Available",
          activeRequests: provider.activeRequests || 0,
          signupDate: provider.signupDate || "9999-12-31"
        });
      }
    });

    if (providers.length > 0) {
      let bestProvider = providers
        .sort((a, b) => 
          (b.rating + b.completedJobs) - (a.rating + a.completedJobs) ||
          a.activeRequests - b.activeRequests ||
          new Date(a.signupDate) - new Date(b.signupDate)
        )
        .find(provider => provider.availability === "Available");

      console.log("✅ Assigned Firestore Provider:", bestProvider);
      return bestProvider;
    }
  }

  // ✅ No Firestore Provider Found → Search External API
  console.log("🔍 No Firestore match. Searching via GeoDB API...");
  let newProvider = await findServiceProviderGeoDB(serviceType, userDistrict, userSubDistrict);
  
  if (newProvider) {
    console.log("✅ Assigned External Provider:", newProvider);
    return newProvider;
  }

  console.log("❌ No providers found.");
  return null;
}

// ✅ **Find Provider via GeoDB API**
async function findServiceProviderGeoDB(serviceType, userDistrict, userSubDistrict) {
  let geoDBUrl = `https://geodb-free-service.wirefreethought.com/v1/geo/cities?namePrefix=${userSubDistrict}&types=CITY&limit=5`;
  console.log("🌍 GeoDB Query URL:", geoDBUrl);

  try {
    let response = await fetch(geoDBUrl);
    let data = await response.json();
    console.log("📡 GeoDB Response:", data);

    if (!data || !data.data || data.data.length === 0) {
      console.log("❌ No GeoDB match.");
      return null;
    }

    let city = data.data[0].city;
    
    // ✅ Search Business Listings for that city
    let businessUrl = `https://geodb-free-service.wirefreethought.com/v1/geo/cities/${city}/businesses?namePrefix=${serviceType}&limit=5`;
    let businessResponse = await fetch(businessUrl);
    let businessData = await businessResponse.json();
    console.log("📡 Business Listings Response:", businessData);

    if (!businessData || !businessData.data || businessData.data.length === 0) {
      console.log("❌ No businesses found.");
      return null;
    }

    let business = businessData.data[0];

    let provider = {
      name: business.name,
      address: business.address,
      phone: business.phone || "Not Available",
      role: "service_provider",
      service: serviceType,
      district: userDistrict,
      subDistrict: userSubDistrict,
      rating: 0,
      completedJobs: 0,
      availability: "Available",
      activeRequests: 0,
      signupDate: new Date().toISOString()
    };

    // ✅ Add to Firestore
    const docRef = await addDoc(collection(db, "users"), provider);
    provider.id = docRef.id;

    console.log("✅ New Provider Added:", provider);
    return provider;

  } catch (error) {
    console.error("❌ GeoDB API Error:", error);
    return null;
  }
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

    
