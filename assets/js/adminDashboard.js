import { auth, db } from "./firebase.js";
import {
  doc, getDoc, getDocs, collection, query, where, updateDoc, deleteDoc, setDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ✅ Authenticate Admin
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("Not signed in. Redirecting...");
    window.location.href = "signin.html";
    return;
  }

  loadAllUsers();
  loadAllProviders();
  loadAllRequests();
  loadAllStats();
});

// ✅ Section 1: Load All Users
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

// ✅ Section 2: Load All Service Providers
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
        <p><b>Name:</b> ${data.username}</p>
        <p><b>Phone:</b> ${data.phone}</p>
        <p><b>Gov ID:</b> <a href="${data.govID}" target="_blank">View ID</a></p>
        <p><b>Location:</b> ${data.address}</p>
        <button onclick="approveGovID('${doc.id}')">Approve Gov ID</button>
        <button onclick="deleteUser('${doc.id}')">Delete Provider</button>
      </div>
      <hr>
    `;
  });
}

window.approveGovID = async function(userId) {
  await updateDoc(doc(db, "users", userId), { govIDApproved: true });
  alert("Gov ID Approved.");
  loadAllProviders();
}

// ✅ Section 3: Load All Service Requests
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
        <button onclick="reassignService('${doc.id}')">Reassign</button>
        <button onclick="changeStatus('${doc.id}')">Change Status</button>
      </div>
      <hr>
    `;
  });
}

window.reassignService = async function(serviceId) {
  const newProviderId = prompt("Enter new Service Provider ID:");
  await updateDoc(doc(db, "services", serviceId), { assignedTo: newProviderId });
  alert("Service Reassigned!");
  loadAllRequests();
}

window.changeStatus = async function(serviceId) {
  const newStatus = prompt("Enter new Status (In Progress, Completed, Cancelled):");
  await updateDoc(doc(db, "services", serviceId), { status: newStatus });
  alert("Status Changed!");
  loadAllRequests();
}

// ✅ Section 4: Manage Subscriptions
window.subscribeUser = async (userId) => {
  await setDoc(doc(db, "subscriptions", userId), {
    plan: "Gold",
    remainingRequests: 35
  });

  alert("User Upgraded to Gold Plan.");
  location.reload();
}

// ✅ Section 5: Load Dashboard Stats
async function loadAllStats() {
  const users = await getDocs(collection(db, "users"));
  const providers = await getDocs(query(collection(db, "users"), where("role", "==", "service_provider")));
  const requests = await getDocs(collection(db, "services"));

  document.getElementById("total-users").textContent = users.size;
  document.getElementById("total-providers").textContent = providers.size;
  document.getElementById("total-requests").textContent = requests.size;
}

// ✅ Section 6: Logout
window.logout = function() {
  auth.signOut();
  window.location.href = "signin.html";
}
