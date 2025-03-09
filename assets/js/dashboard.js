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

// ✅ Initialize Dashboard Based on Role
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

    // ✅ Load Different Dashboard Based on Role
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
// ✅ 1. Load User Dashboard
//
async function loadUserDashboard(userId, dashboard, userData) {
  const isProfileComplete = userData.address && userData.phone;

  dashboard.innerHTML = `
    <h2>Welcome, ${userData.name}</h2>
    <a href="profile.html?id=${userId}">View Profile</a>
    <section id="request-service">
      <h3>Request a Service</h3>
      <form id="request-service-form">
        <select id="service" required>
          <option value="" disabled selected>Select a service</option>
        </select>
        <button type="submit">Request Service</button>
      </form>
      <h3>Your Service Requests</h3>
      <div id="user-requests"></div>
    </section>
  `;

  loadServicesOptions();
  loadUserRequests(userId);

  document.getElementById("request-service-form").addEventListener("submit", (e) => requestService(e, userId));
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

async function requestService(e, userId) {
  e.preventDefault();
  const serviceName = document.getElementById("service").value;
  await setDoc(doc(collection(db, "services")), {
    serviceName,
    requestedBy: userId,
    status: "Pending",
    assignedTo: null,
  });
  alert("Service Requested Successfully!");
  loadUserRequests(userId);
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
// ✅ 2. Load Service Provider Dashboard
//
async function loadProviderDashboard(providerId, dashboard, userData) {
  dashboard.innerHTML = `
    <h2>Welcome, ${userData.name}</h2>
    <a href="profile.html?id=${providerId}">View Profile</a>
    <h3>Assigned Services</h3>
    <div id="provider-requests"></div>
  `;

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
      <p><b>Service:</b> ${data.serviceName} | 
      <b>Status:</b> ${data.status}</p>
    `;
  });
}

//
// ✅ 3. Load Admin Dashboard
//
async function loadAdminDashboard(dashboard) {
  dashboard.innerHTML = `
    <h2>Admin Panel</h2>
    <h3>All Service Requests</h3>
    <div id="admin-requests"></div>
  `;

  loadAllRequests();
}

async function loadAllRequests() {
  const adminRequestsDiv = document.getElementById("admin-requests");
  adminRequestsDiv.innerHTML = "";

  const querySnapshot = await getDocs(collection(db, "services"));
  if (querySnapshot.empty) {
    adminRequestsDiv.innerHTML = `<p>No service requests found.</p>`;
    return;
  }

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    adminRequestsDiv.innerHTML += `
      <p>
        <b>Service:</b> ${data.serviceName} | 
        <b>Requested By:</b> <a href="profile.html?id=${data.requestedBy}">View Profile</a> | 
        <b>Status:</b> ${data.status}
      </p>
    `;
  });
}
