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

// ✅ Initialize Dashboard
export async function initializeDashboard() {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      alert("Not signed in. Redirecting to sign-in page.");
      window.location.href = "signin.html";
      return;
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      alert("User data not found! Redirecting.");
      window.location.href = "signin.html";
      return;
    }

    const userData = userDoc.data();
    const role = userData.role;
    const dashboard = document.getElementById("dashboard");

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

// ✅ 1. Load User Dashboard
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
          <option value="Plumbing">Plumbing</option>
          <option value="Electrician">Electrician</option>
          <option value="Carpentry">Carpentry</option>
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
    loadUserRequests(userId);
  }
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

  querySnapshot.forEach(doc => {
    const data = doc.data();
    requestsDiv.innerHTML += `
      <p><b>Service:</b> ${data.serviceName} | <b>Status:</b> ${data.status}</p>
    `;
  });
}

function saveUserProfile(event, userId) {
  event.preventDefault();
  const address = document.getElementById("address").value;
  const phone = document.getElementById("phone").value;

  updateDoc(doc(db, "users", userId), { address, phone })
    .then(() => location.reload())
    .catch((error) => console.error("Error updating profile:", error));
}

// ✅ 2. Load Provider Dashboard
async function loadProviderDashboard(userId, dashboard) {
  dashboard.innerHTML = `
    <h2>Your Assigned Services</h2>
    <div id="provider-requests"></div>
  `;

  const requestsDiv = document.getElementById("provider-requests");
  const q = query(collection(db, "services"), where("assignedTo", "==", userId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    requestsDiv.innerHTML = `<p>No assigned services.</p>`;
    return;
  }

  querySnapshot.forEach(doc => {
    const data = doc.data();
    requestsDiv.innerHTML += `
      <p><b>Service:</b> ${data.serviceName} | <b>Status:</b> ${data.status}</p>
      <button onclick="updateServiceStatus('${doc.id}', 'Completed')">Mark as Completed</button>
    `;
  });
}

async function updateServiceStatus(serviceId, status) {
  await updateDoc(doc(db, "services", serviceId), { status });
  alert("Service marked as completed!");
  location.reload();
}

// ✅ 3. Load Admin Dashboard
async function loadAdminDashboard(dashboard) {
  dashboard.innerHTML = `
    <h2>Manage All Services</h2>
    <div id="admin-requests"></div>
  `;

  const adminRequestsDiv = document.getElementById("admin-requests");
  const querySnapshot = await getDocs(collection(db, "services"));

  if (querySnapshot.empty) {
    adminRequestsDiv.innerHTML = `<p>No services found.</p>`;
    return;
  }

  querySnapshot.forEach(async (doc) => {
    const data = doc.data();
    const userDoc = await getDoc(doc(db, "users", data.requestedBy));
    const userName = userDoc.exists() ? userDoc.data().name : "Unknown";

    adminRequestsDiv.innerHTML += `
      <p><b>Service:</b> ${data.serviceName} | <b>Requested By:</b> ${userName} | 
      <b>Status:</b> ${data.status}</p>
      <button onclick="assignService('${doc.id}')">Assign to Provider</button>
    `;
  });
}

async function assignService(serviceId) {
  const providerId = prompt("Enter Service Provider ID:");
  await updateDoc(doc(db, "services", serviceId), { assignedTo: providerId, status: "Assigned" });
  alert("Service assigned successfully!");
  location.reload();
}
