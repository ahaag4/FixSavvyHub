import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Initialize Dashboard
export async function initializeDashboard() {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      alert("Not signed in. Redirecting to sign-in page.");
      window.location.href = "signin.html";
      return;
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      alert("User data not found!");
      return;
    }

    const userData = userDoc.data();
    const role = userData.role;
    const dashboard = document.getElementById("dashboard");

    // Load dashboard content based on user role
    if (role === "user") {
      loadUserDashboard(user.uid, dashboard, userData);
    } else if (role === "service_provider") {
      loadProviderDashboard(user.uid, dashboard, userData);
    } else if (role === "admin") {
      loadAdminDashboard(dashboard);
    } else {
      dashboard.innerHTML = `<p>Role not recognized.</p>`;
    }
  });
}

//
// 1. Load User Dashboard
//
async function loadUserDashboard(userId, dashboard, userData) {
  const isProfileComplete = userData.address && userData.phone;

  dashboard.innerHTML = `
    <section id="profile-completion" style="${isProfileComplete ? "display: none;" : ""}">
      <h2>Complete Your Profile</h2>
      <form id="user-profile-form">
        <label for="address">Address</label>
        <input type="text" id="address" required placeholder="Enter your address">
        <label for="phone">Phone</label>
        <input type="text" id="phone" required placeholder="Enter your phone number">
        <button type="submit">Save Profile</button>
      </form>
    </section>
    <section id="request-service" style="${isProfileComplete ? "" : "display: none;"}">
      <h2>Request a Service</h2>
      <form id="request-service-form">
        <label for="service">Service</label>
<select id="service" required>
          <option value="" disabled selected>Select a service</option>
          ${services.map(service => `<option value="${service}">${service}</option>`).join("")}
        </select>
        <button type="submit">Request Service</button>
      </form>
      <h3>Your Service Requests</h3>
      <div id="user-requests"></div>
    </section>
  `;

  if (!isProfileComplete) {
    document.getElementById("user-profile-form").addEventListener("submit", (e) => saveUserProfile(e, userId));
  } else {
    loadServicesOptions();
    loadUserRequests(userId);
  }
}

async function saveUserProfile(e, userId) {
  e.preventDefault();
  const address = document.getElementById("address").value;
  const phone = document.getElementById("phone").value;

  if (!address || !phone) {
    alert("Please complete all fields.");
    return;
  }

  await updateDoc(doc(db, "users", userId), { address, phone });
  alert("Profile updated successfully!");
  document.getElementById("profile-completion").style.display = "none";
  document.getElementById("request-service").style.display = "";
  loadServicesOptions();
  loadUserRequests(userId);
}

async function loadServicesOptions() {
  const servicesSnapshot = await getDocs(collection(db, "available_services"));
  const serviceSelect = document.getElementById("service");
  serviceSelect.innerHTML = `<option value="" disabled selected>Select a service</option>`;
  servicesSnapshot.forEach((doc) => {
    const service = doc.data();
    serviceSelect.innerHTML += `<option value="${service.name}">${service.name}</option>`;
  });
}

async function loadUserRequests(userId) {
  const requestsDiv = document.getElementById("user-requests");
  requestsDiv.innerHTML = "";

  const q = query(collection(db, "services"), where("requestedBy", "==", userId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    requestsDiv.innerHTML = `<p>No requests found.</p>`;
    return;
  }

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    requestsDiv.innerHTML += `
      <p><b>Service:</b> ${data.serviceName} | <b>Status:</b> ${data.status}</p>
    `;
  });
}

//
// 2. Load Service Provider Dashboard
//
async function loadProviderDashboard(providerId, dashboard, userData) {
  const isProfileComplete = userData.address && userData.phone && userData.govID;

  dashboard.innerHTML = `
    <section id="profile-completion" style="${isProfileComplete ? "display: none;" : ""}">
      <h2>Complete Your Profile</h2>
      <form id="provider-profile-form">
        <label for="address">Address</label>
        <input type="text" id="address" required placeholder="Enter your address">
        <label for="phone">Phone</label>
        <input type="text" id="phone" required placeholder="Enter your phone number">
        <label for="gov-id">Upload Government ID</label>
        <input type="file" id="gov-id" required>
        <button type="submit">Save Profile</button>
      </form>
    </section>
    <section id="assigned-requests" style="${isProfileComplete ? "" : "display: none;"}">
      <h2>Assigned Services</h2>
      <div id="provider-requests"></div>
    </section>
  `;

  if (!isProfileComplete) {
    document.getElementById("provider-profile-form").addEventListener("submit", (e) => saveProviderProfile(e, providerId));
  } else {
    loadProviderRequests(providerId);
  }
}

async function saveProviderProfile(e, providerId) {
  e.preventDefault();
  const address = document.getElementById("address").value;
  const phone = document.getElementById("phone").value;
  const govID = document.getElementById("gov-id").files[0];

  if (!address || !phone || !govID) {
    alert("Please complete all fields.");
    return;
  }

  await updateDoc(doc(db, "users", providerId), {
    address,
    phone,
    govID: govID.name,
  });

  alert("Profile updated successfully!");
  document.getElementById("profile-completion").style.display = "none";
  document.getElementById("assigned-requests").style.display = "";
  loadProviderRequests(providerId);
}

async function loadProviderRequests(providerId) {
  const requestsDiv = document.getElementById("provider-requests");
  requestsDiv.innerHTML = "";

  const q = query(collection(db, "services"), where("assignedTo", "==", providerId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    requestsDiv.innerHTML = `<p>No assigned services.</p>`;
    return;
  }

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    requestsDiv.innerHTML += `
      <p><b>Service:</b> ${data.serviceName} | <b>Status:</b> ${data.status}</p>
    `;
  });
}

//
// 3. Load Admin Dashboard
//
async function loadAdminDashboard(dashboard) {
  dashboard.innerHTML = `
    <h2>Manage Services</h2>
    <div id="admin-requests"></div>
  `;

  const adminRequestsDiv = document.getElementById("admin-requests");
  const querySnapshot = await getDocs(collection(db, "services"));

  if (querySnapshot.empty) {
    adminRequestsDiv.innerHTML = `<p>No services found.</p>`;
    return;
  }

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    adminRequestsDiv.innerHTML += `
      <p><b>Service:</b> ${data.serviceName} | <b>Requested By:</b> ${data.requestedBy} | 
      <b>Assigned To:</b> ${data.assignedTo || "Unassigned"} | <b>Status:</b> ${data.status}</p>
    `;
  });
}
