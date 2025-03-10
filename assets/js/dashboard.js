import { auth, db } from "./firebase.js";
import { collection, doc, getDoc, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const userRequestsDiv = document.getElementById("user-requests");
const providerRequestsDiv = document.getElementById("provider-requests");
const allRequestsDiv = document.getElementById("all-requests");

// Function to load user-specific dashboard
async function loadUserDashboard(userId) {
  const querySnapshot = await getDocs(collection(db, "service_requests"));
  let content = `<h3>Your Service Requests</h3>`;
  
  querySnapshot.forEach(doc => {
    const data = doc.data();
    if (data.requestedBy === userId) {
      content += `
        <div class="service-card">
          <p><strong>Service:</strong> ${data.serviceName}</p>
          <p><strong>Status:</strong> ${data.status}</p>
          <p><strong>Assigned To:</strong> ${data.assignedTo ? `<a href="profile.html?id=${data.assignedTo}">View Provider Profile</a>` : "Not Assigned"}</p>
        </div>`;
    }
  });

  if (content === `<h3>Your Service Requests</h3>`) {
    content += `<p>No service requests found.</p>`;
  }

  userRequestsDiv.innerHTML = content;
}

// Function to load service provider-specific dashboard
async function loadProviderDashboard(userId) {
  const querySnapshot = await getDocs(collection(db, "service_requests"));
  let content = `<h3>Assigned Service Requests</h3>`;
  
  querySnapshot.forEach(doc => {
    const data = doc.data();
    if (data.assignedTo === userId) {
      content += `
        <div class="service-card">
          <p><strong>Service:</strong> ${data.serviceName}</p>
          <p><strong>Status:</strong> ${data.status}</p>
          <p><strong>Requested By:</strong> <a href="profile.html?id=${data.requestedBy}">View User Profile</a></p>
        </div>`;
    }
  });

  if (content === `<h3>Assigned Service Requests</h3>`) {
    content += `<p>No assigned service requests.</p>`;
  }

  providerRequestsDiv.innerHTML = content;
}

// Function to load admin-specific dashboard
async function loadAdminDashboard() {
  const querySnapshot = await getDocs(collection(db, "service_requests"));
  let content = `<h3>All Service Requests</h3>`;
  
  querySnapshot.forEach(doc => {
    const data = doc.data();
    content += `
      <div class="service-card">
        <p><strong>Service:</strong> ${data.serviceName}</p>
        <p><strong>Status:</strong> ${data.status}</p>
        <p><strong>Requested By:</strong> <a href="profile.html?id=${data.requestedBy}">View User Profile</a></p>
        <p><strong>Assigned To:</strong> ${data.assignedTo ? `<a href="profile.html?id=${data.assignedTo}">View Provider Profile</a>` : "Not Assigned"}</p>
        ${data.status !== "Completed" ? `
        <button onclick="assignProvider('${doc.id}')">Assign Provider</button>` : ""}
      </div>`;
  });

  allRequestsDiv.innerHTML = content;
}

// Function to assign service provider (Admin Only)
window.assignProvider = async function(requestId) {
  const providerId = prompt("Enter Service Provider ID:");
  if (providerId) {
    const requestRef = doc(db, "service_requests", requestId);
    await updateDoc(requestRef, {
      assignedTo: providerId,
      status: "In Progress"
    });
    alert("Provider assigned successfully.");
    location.reload();
  }
}

// Function to detect user role and load appropriate dashboard
async function loadDashboard(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const userData = userSnap.data();
    if (userData.role === "user") {
      loadUserDashboard(user.uid);
      userRequestsDiv.style.display = "block";
    } else if (userData.role === "provider") {
      loadProviderDashboard(user.uid);
      providerRequestsDiv.style.display = "block";
    } else if (userData.role === "admin") {
      loadAdminDashboard();
      allRequestsDiv.style.display = "block";
    }
  } else {
    alert("User data not found. Please contact support.");
  }
}

// Initialize Dashboard
auth.onAuthStateChanged((user) => {
  if (user) {
    loadDashboard(user);
  } else {
    alert("You are not signed in. Redirecting...");
    window.location.href = "signin.html";
  }
});
