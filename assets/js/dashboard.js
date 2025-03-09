import { auth, db, storage } from "./firebase.js";
import {
  doc, getDoc, getDocs, collection, query, where, updateDoc, setDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

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
  dashboard.innerHTML = `
    <section id="user-dashboard">
      <h2>Welcome, ${userData.name}</h2>
      <button onclick="window.location.href='profile.html'">View Profile</button>
      <h3>Request a Service</h3>
      <form id="request-service-form">
        <label for="service">Service</label>
        <select id="service" required></select>
        <label for="service-time">Preferred Date & Time</label>
        <input type="datetime-local" id="service-time" required>
        <button type="submit">Request Service</button>
      </form>
      <h3>Your Service Requests</h3>
      <div id="user-requests"></div>
    </section>
  `;

  document.getElementById("request-service-form").addEventListener("submit", (e) => requestService(e, userId));
  loadServicesOptions();
  loadUserRequests(userId);
}

//
// ✅ 2. Request Service
//
async function requestService(e, userId) {
  e.preventDefault();
  const service = document.getElementById("service").value;
  const serviceTime = document.getElementById("service-time").value;

  const newRequest = {
    serviceName: service,
    requestedBy: userId,
    status: "Pending",
    dateTime: serviceTime,
    paymentStatus: "Unpaid",
    feedback: "",
    assignedTo: null
  };

  await setDoc(doc(collection(db, "services")), newRequest);
  alert("Service request submitted.");
  loadUserRequests(userId);
}

//
// ✅ 3. Load Services Options
//
async function loadServicesOptions() {
  const servicesSnapshot = await getDocs(collection(db, "available_services"));
  const serviceSelect = document.getElementById("service");
  serviceSelect.innerHTML = `<option value="" disabled selected>Select a service</option>`;
  servicesSnapshot.forEach((doc) => {
    const service = doc.data();
    serviceSelect.innerHTML += `<option value="${service.name}">${service.name}</option>`;
  });
}

//
// ✅ 4. Load User Requests
//
async function loadUserRequests(userId) {
  const requestsDiv = document.getElementById("user-requests");
  requestsDiv.innerHTML = "";

  const q = query(collection(db, "services"), where("requestedBy", "==", userId));
  const querySnapshot = await getDocs(q);

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    requestsDiv.innerHTML += `
      <div>
        <p><b>Service:</b> ${data.serviceName}</p>
        <p><b>Status:</b> ${data.status}</p>
        <p><b>Payment:</b> ${data.paymentStatus}</p>
        <p><b>Completion Time:</b> ${data.completionTime || "N/A"}</p>
        <p><b>Feedback:</b> ${data.feedback || "N/A"}</p>
      </div>
    `;
  });
}

//
// ✅ 5. Upload Profile Picture & Government ID
//
async function uploadFile(file, fileType, userId) {
  const fileRef = ref(storage, `${fileType}/${userId}`);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);

  await updateDoc(doc(db, "users", userId), {
    [fileType]: url
  });

  alert(`${fileType} uploaded successfully.`);
}

document.getElementById("profile-picture").addEventListener("change", (e) => {
  uploadFile(e.target.files[0], "profilePicture", auth.currentUser.uid);
});

document.getElementById("gov-id").addEventListener("change", (e) => {
  uploadFile(e.target.files[0], "govId", auth.currentUser.uid);
});

//
// ✅ 6. Auto-Assign Services
//
async function autoAssignService(serviceDoc) {
  const serviceData = serviceDoc.data();
  const userLocation = serviceData.userLocation;
  
  const q = query(collection(db, "users"), where("role", "==", "service_provider"));
  const providersSnapshot = await getDocs(q);

  let nearestProvider = null;
  providersSnapshot.forEach((providerDoc) => {
    const providerData = providerDoc.data();
    if (providerData.location === userLocation) {
      nearestProvider = providerDoc.id;
    }
  });

  if (nearestProvider) {
    await updateDoc(serviceDoc.ref, {
      assignedTo: nearestProvider,
      status: "Assigned"
    });
  }
}

//
// ✅ 7. Logout
//
document.getElementById("logout").addEventListener("click", () => {
  auth.signOut().then(() => {
    window.location.href = "signin.html";
  });
});
