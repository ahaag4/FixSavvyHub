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
      loadProviderDashboard(user.uid, dashboard, userData);  
    } else if (role === "admin") {  
      loadAdminDashboard(dashboard);  
    } else {  
      dashboard.innerHTML = `<p>Role not recognized.</p>`;  
    }  
  });  
}  

// Load User Dashboard
async function loadUserDashboard(userId, dashboard, userData) {  
  const isProfileComplete = userData.address && userData.phone;  

  dashboard.innerHTML = `  
    <section id="request-service" style="${isProfileComplete ? "" : "display: none;"}">  
      <h2>Request a Service</h2>  
      <form id="request-service-form">  
        <label for="service">Service</label>  
        <select id="service" required>  
          <option value="" disabled selected>Select a service</option>  
          <option value="Plumbing">Plumbing</option>  
          <option value="Electrician">Electrician</option>  
          <option value="Cleaning">Cleaning</option>  
        </select>  
        <button type="submit">Request Service</button>  
      </form>  
      <h3>Your Service Requests</h3>  
      <div id="user-requests"></div>  
    </section>  
  `;  

  document.getElementById("request-service-form").addEventListener("submit", (e) => requestService(e, userId));  
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

  querySnapshot.forEach(async (doc) => {  
    const data = doc.data();  
    requestsDiv.innerHTML += `  
      <p><b>Service:</b> ${data.serviceName} | <b>Status:</b> ${data.status}</p>  
    `;  
  });  
}  

async function requestService(event, userId) {  
  event.preventDefault();  

  const serviceName = document.getElementById("service").value;  
  const newRequest = {  
    serviceName: serviceName,  
    requestedBy: userId,  
    status: "Pending",  
    assignedTo: "",  
    location: "Delhi"  
  };  

  await setDoc(doc(collection(db, "services")), newRequest);  
  alert("Service request submitted successfully!");  
  loadUserRequests(userId);  
}  

// Load Admin Dashboard
async function loadAdminDashboard(dashboard) {  
  dashboard.innerHTML = `  
    <h2>Manage Service Requests</h2>  
    <div id="admin-requests"></div>  
  `;  

  const adminRequestsDiv = document.getElementById("admin-requests");  
  const querySnapshot = await getDocs(collection(db, "services"));  

  if (querySnapshot.empty) {  
    adminRequestsDiv.innerHTML = `<p>No requests found.</p>`;  
    return;  
  }  

  querySnapshot.forEach(async (doc) => {  
    const data = doc.data();  
    const userDoc = await getDoc(doc(db, "users", data.requestedBy));  
    const userName = userDoc.exists() ? userDoc.data().email : "Unknown";  

    adminRequestsDiv.innerHTML += `  
      <p><b>Service:</b> ${data.serviceName} |  
      <b>Requested By:</b> ${userName} |  
      <b>Status:</b> ${data.status}</p>  
    `;  
  });  
}  
