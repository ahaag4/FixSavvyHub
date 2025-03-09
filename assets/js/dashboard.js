import { auth, db, storage } from "./firebase.js";
import {
  collection, query, where, getDocs, doc, setDoc, updateDoc, onSnapshot, getDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// ✅ Ensure User Is Signed In
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "signin.html";
    return;
  }

  loadUserProfile(user.uid);
  loadAvailableServices();
  loadUserRequests(user.uid);
});

// ✅ Load User Profile
async function loadUserProfile(userId) {
  const userDoc = await getDoc(doc(db, "users", userId));
  if (!userDoc.exists()) return;

  const userData = userDoc.data();
  document.getElementById("user-name").innerText = userData.name;
  document.getElementById("user-phone").innerText = userData.phone;
  document.getElementById("user-address").innerText = userData.address;

  // ✅ Load Profile Picture
  if (userData.profilePic) {
    document.getElementById("user-pic").src = userData.profilePic;
  }

  // ✅ Load Aadhaar/PAN Card
  if (userData.govId) {
    document.getElementById("user-gov-id").innerHTML = `
      <a href="${userData.govId}" target="_blank">View Aadhaar/PAN Card</a>
    `;
  }
}

// ✅ Load Services Dropdown
async function loadAvailableServices() {
  const serviceSelect = document.getElementById("service");
  const snapshot = await getDocs(collection(db, "available_services"));
  snapshot.forEach(doc => {
    const service = doc.data();
    serviceSelect.innerHTML += `<option value="${service.name}">${service.name}</option>`;
  });
}

// ✅ Request Service
document.getElementById("service-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const service = document.getElementById("service").value;
  const dateTime = document.getElementById("date-time").value;
  const userId = auth.currentUser.uid;

  const newRequest = {
    serviceName: service,
    userId: userId,
    status: "Pending",
    dateTime: dateTime,
    assignedTo: null
  };

  await setDoc(doc(collection(db, "services")), newRequest);
  alert("Service requested successfully.");
  loadUserRequests(userId);
});

// ✅ Load User Requests
async function loadUserRequests(userId) {
  const requestDiv = document.getElementById("requests");
  requestDiv.innerHTML = "";

  const q = query(collection(db, "services"), where("userId", "==", userId));
  const snapshot = await getDocs(q);

  snapshot.forEach(doc => {
    const data = doc.data();
    requestDiv.innerHTML += `
      <div>
        <p><b>Service:</b> ${data.serviceName}</p>
        <p><b>Status:</b> ${data.status}</p>
        <p><b>Date:</b> ${data.dateTime}</p>
        <p><b>Assigned To:</b> ${data.assignedTo || "Not Assigned"}</p>
        <hr>
      </div>
    `;

    if (data.status === "Pending") {
      autoAssignService(doc);
    }
  });
}

// ✅ Auto-Assign Service Based on Location
async function autoAssignService(serviceDoc) {
  const serviceData = serviceDoc.data();
  const userDoc = await getDoc(doc(db, "users", serviceData.userId));
  const userLocation = userDoc.data().address;

  const q = query(collection(db, "users"), where("role", "==", "service_provider"));
  const providersSnapshot = await getDocs(q);

  let nearestProvider = null;
  providersSnapshot.forEach(providerDoc => {
    const providerData = providerDoc.data();
    if (providerData.address === userLocation) {
      nearestProvider = providerDoc.id;
    }
  });

  if (nearestProvider) {
    await updateDoc(serviceDoc.ref, {
      assignedTo: nearestProvider,
      status: "Assigned"
    });

    alert("Service has been auto-assigned to a provider.");
    loadUserRequests(auth.currentUser.uid);
  }
}

// ✅ Logout Function
function logout() {
  auth.signOut();
  window.location.href = "signin.html";
}
document.getElementById("logout-btn").addEventListener("click", logout);
