import { auth, db } from "./firebase.js";
import {
  doc, setDoc, getDoc, collection, getDocs, query, where, updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let userId;

// ✅ Authenticate Service Provider
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("You are not signed in. Redirecting...");
    window.location.href = "signin.html";
    return;
  }

  userId = user.uid;
  await loadServiceProviderProfile();
  await loadAssignedServices();
  await loadServiceHistory();
});

// ✅ Section 1: Load Profile
async function loadServiceProviderProfile() {
  const userDoc = await getDoc(doc(db, "users", userId));

  if (userDoc.exists()) {
    const userData = userDoc.data();
    document.getElementById("username").value = userData.username;
    document.getElementById("phone").value = userData.phone;
    document.getElementById("address").value = userData.address;

    if (userData.phone && userData.address && userData.govID) {
      document.getElementById("section-1").classList.add("hidden");
      document.getElementById("section-2").classList.remove("hidden");
      document.getElementById("section-3").classList.remove("hidden");
      document.getElementById("section-4").classList.remove("hidden");
    }
  }
}

// ✅ Section 2: Load Assigned Services
async function loadAssignedServices() {
  const q = query(collection(db, "services"), where("assignedTo", "==", userId));
  const services = await getDocs(q);

  const container = document.getElementById("assigned-service");
  container.innerHTML = "";

  if (services.empty) {
    container.innerHTML = `<p>No services assigned yet.</p>`;
    return;
  }

  services.forEach(async (docSnap) => {
    const data = docSnap.data();

    if (!data.requestedBy) {
      container.innerHTML += `
        <p><b>Service:</b> ${data.serviceName}</p>
        <p><b>Status:</b> ${data.status}</p>
        <p style="color: red;"><b>Error:</b> RequestedBy Undefined</p>
      `;
      return;
    }

    const userRef = await getDoc(doc(db, "users", data.requestedBy));
    const user = userRef.exists() ? userRef.data() : null;

    container.innerHTML += `
      <p><b>Service:</b> ${data.serviceName}</p>
      <p><b>Status:</b> ${data.status}</p>
      <p><b>Requested By:</b> ${user ? user.username : "Unknown"}</p>
      <p><b>Phone:</b> ${user ? user.phone : "N/A"}</p>
      <p><b>Address:</b> ${user ? user.address : "N/A"}</p>
      <a href="profile.html?id=${data.requestedBy}" target="_blank">View User Profile</a>
      <button onclick="markCompleted('${docSnap.id}')">Mark Completed</button>
    `;
  });
}

// ✅ Section 3: Mark Service Completed
window.markCompleted = async (serviceId) => {
  await updateDoc(doc(db, "services", serviceId), { status: "Completed" });
  alert("Service marked as completed!");
  location.reload();
};

// ✅ Section 4: Load Service History
async function loadServiceHistory() {
  const q = query(collection(db, "services"), where("assignedTo", "==", userId));
  const services = await getDocs(q);

  const container = document.getElementById("service-history");
  container.innerHTML = "";

  services.forEach((docSnap) => {
    const data = docSnap.data();
    container.innerHTML += `
      <p><b>Service:</b> ${data.serviceName}</p>
      <p><b>Status:</b> ${data.status}</p>
    `;
  });
}

// ✅ Section 5: View My Profile
document.getElementById("view-profile").href = `profile.html?id=${userId}`;
