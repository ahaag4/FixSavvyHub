import { auth, db } from "./firebase.js";
import {
  doc, getDoc, getDocs, collection, query, where, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ==========================
// ✅ Admin Dashboard Initialization
// ==========================
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("Not signed in. Redirecting...");
    window.location.href = "signin.html";
    return;
  }

  loadAllUsers();
  loadAllProviders();
  loadAllRequests();
});

// ==========================
// ✅ Load All Users
// ==========================
async function loadAllUsers() {
  const usersDiv = document.getElementById("all-users");
  usersDiv.innerHTML = `<p>Loading...</p>`;

  const querySnapshot = await getDocs(collection(db, "users"));
  usersDiv.innerHTML = "";

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    usersDiv.innerHTML += `
      <div>
        <p><b>Username:</b> ${data.username}</p>
        <p><b>Phone:</b> ${data.phone}</p>
        <p><b>Address:</b> ${data.address}</p>
        <p><b>Role:</b> ${data.role}</p>
        <button onclick="viewProfile('${doc.id}')">View Profile</button>
        <button onclick="deleteUser('${doc.id}')">Delete User</button>
      </div>
      <hr>
    `;
  });
}

window.viewProfile = function(userId) {
  window.location.href = `profile.html?id=${userId}`;
}

window.deleteUser = async function(userId) {
  if (confirm("Are you sure you want to delete this user?")) {
    await deleteDoc(doc(db, "users", userId));
    alert("User deleted successfully.");
    loadAllUsers();
  }
}

// ==========================
// ✅ Load All Service Providers
// ==========================
async function loadAllProviders() {
  const providersDiv = document.getElementById("all-providers");
  providersDiv.innerHTML = `<p>Loading...</p>`;

  const q = query(collection(db, "users"), where("role", "==", "service_provider"));
  const querySnapshot = await getDocs(q);
  providersDiv.innerHTML = "";

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    providersDiv.innerHTML += `
      <div>
        <p><b>Name:</b> ${data.name}</p>
        <p><b>Phone:</b> ${data.phone}</p>
        <p><b>Gov ID:</b> <a href="${data.govID}" target="_blank">View ID</a></p>
        <p><b>Location:</b> ${data.address}</p>
        <button onclick="viewProfile('${doc.id}')">View Profile</button>
        <button onclick="deleteUser('${doc.id}')">Delete Provider</button>
      </div>
      <hr>
    `;
  });
}

// ==========================
// ✅ Load All Service Requests with Date, Time & Feedback
// ==========================
async function loadAllRequests() {
  const requestsDiv = document.getElementById("all-requests");
  requestsDiv.innerHTML = `<p>Loading...</p>`;

  const querySnapshot = await getDocs(collection(db, "services"));
  requestsDiv.innerHTML = "";

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    requestsDiv.innerHTML += `
      <div>
        <p><b>Service:</b> ${data.serviceName}</p>
        <p><b>Requested By:</b> ${data.requestedBy}</p>
        <p><b>Assigned To:</b> ${data.assignedTo || "Unassigned"}</p>
        <p><b>Status:</b> ${data.status}</p>
        <p><b>Request Date:</b> ${data.requestDate || "N/A"}</p>
        <p><b>Completion Date:</b> ${data.completionDate || "N/A"}</p>
        <p><b>Feedback:</b> ${data.feedback || "No Feedback"}</p>
        <p><b>Rating:</b> ${data.rating || "Not Rated"}</p>
        <button onclick="markCompleted('${doc.id}')">Mark Completed</button>
        <button onclick="cancelService('${doc.id}')">Cancel Service</button>
      </div>
      <hr>
    `;
  });
}

window.markCompleted = async function(serviceId) {
  await updateDoc(doc(db, "services", serviceId), { status: "Completed" });
  alert("Service marked as completed.");
  loadAllRequests();
}

window.cancelService = async function(serviceId) {
  await updateDoc(doc(db, "services", serviceId), { status: "Cancelled" });
  alert("Service cancelled.");
  loadAllRequests();
}

window.logout = function() {
  auth.signOut();
  window.location.href = "signin.html";
}
