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

    if (role === "user") {
      loadUserDashboard(user.uid, dashboard, userData);
    } else if (role === "service_provider") {
      loadProviderDashboard(user.uid, dashboard);
    } else if (role === "admin") {
      loadAdminDashboard(dashboard);
    } else {
      dashboard.innerHTML = `<p>Role not recognized.</p>`;
    }
  });
}

// =====================
// ✅ 1. Load User Dashboard
// =====================
async function loadUserDashboard(userId, dashboard, userData) {
  const isProfileComplete = userData.address && userData.phone;

  dashboard.innerHTML = `
    <section id="profile-completion" style="${isProfileComplete ? "display: none;" : ""}">
      <h2>Complete Your Profile</h2>
      <form id="user-profile-form">
        <label for="address">Address</label>
        <input type="text" id="address" required value="${userData.address || ""}">
        <label for="phone">Phone</label>
        <input type="text" id="phone" required value="${userData.phone || ""}">
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
          <option value="Carpenter">Carpenter</option>
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

  querySnapshot.forEach(async (docSnap) => {
    const data = docSnap.data();
    requestsDiv.innerHTML += `
      <p><b>Service:</b> ${data.serviceName} | 
      <b>Status:</b> ${data.status} | 
      <a href="profile.html?id=${data.assignedTo}" target="_blank">View Service Provider</a> | 
      <button onclick="cancelService('${docSnap.id}')">Cancel</button></p>
    `;
  });
}

window.cancelService = async function (serviceId) {
  await updateDoc(doc(db, "services", serviceId), { status: "Cancelled" });
  alert("Service cancelled successfully.");
  location.reload();
};

// =====================
// ✅ 2. Load Admin Dashboard
// =====================
async function loadAdminDashboard(dashboard) {
  dashboard.innerHTML = `
    <h2>All Service Requests</h2>
    <div id="admin-requests"></div>
  `;

  const requestsDiv = document.getElementById("admin-requests");
  const querySnapshot = await getDocs(collection(db, "services"));

  querySnapshot.forEach(async (docSnap) => {
    const data = docSnap.data();

    requestsDiv.innerHTML += `
      <p><b>Service:</b> ${data.serviceName} | 
      <a href="profile.html?id=${data.requestedBy}" target="_blank">View User</a> | 
      <a href="profile.html?id=${data.assignedTo}" target="_blank">View Provider</a> | 
      <b>Status:</b> ${data.status}</p>
    `;
  });
}

// =====================
// ✅ 3. Load Provider Dashboard
// =====================
async function loadProviderDashboard(userId, dashboard) {
  dashboard.innerHTML = `
    <h2>Your Assigned Services</h2>
    <div id="provider-requests"></div>
  `;

  const requestsDiv = document.getElementById("provider-requests");
  const q = query(collection(db, "services"), where("assignedTo", "==", userId));
  const querySnapshot = await getDocs(q);

  querySnapshot.forEach(async (docSnap) => {
    const data = docSnap.data();

    requestsDiv.innerHTML += `
      <p><b>Service:</b> ${data.serviceName} | 
      <a href="profile.html?id=${data.requestedBy}" target="_blank">View User</a> | 
      <b>Status:</b> ${data.status} | 
      <button onclick="markCompleted('${docSnap.id}')">Mark Completed</button></p>
    `;
  });
}

window.markCompleted = async function (serviceId) {
  await updateDoc(doc(db, "services", serviceId), { status: "Completed" });
  alert("Service marked as completed.");
  location.reload();
};

// =====================
// ✅ Helper Function (Profile Link)
// =====================
async function getUserEmail(userId) {
  if (!userId) return "Not Assigned";
  const userDoc = await getDoc(doc(db, "users", userId));
  if (userDoc.exists()) {
    return userDoc.data().email;
  }
  return "Not Found";
}
