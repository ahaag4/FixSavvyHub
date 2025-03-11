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

// ✅ Section 1: Complete Profile
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

document.getElementById("profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const phone = document.getElementById("phone").value;
  const address = document.getElementById("address").value;
  const govIDFile = document.getElementById("gov-id").files[0];

  await setDoc(doc(db, "users", userId), {
    username, phone, address,
    govID: govIDFile.name,
    role: "service_provider"
  }, { merge: true });

  alert("Profile Updated!");
  location.reload();
});

// ✅ Section 2: Load Assigned Services
async function loadAssignedServices() {
  const q = query(collection(db, "services"), where("assignedTo", "==", userId));
  const services = await getDocs(q);

  const container = document.getElementById("assigned-service");
  container.innerHTML = "";

  services.forEach(async (docSnap) => {
    const data = docSnap.data();
    const userRef = await getDoc(doc(db, "users", data.requestedBy));
    const user = userRef.data();

    container.innerHTML += `
      <p><b>Service:</b> ${data.serviceName}</p>
      <p><b>Requested By:</b> ${user.username}</p>
      <p><b>Phone:</b> ${user.phone}</p>
      <p><b>Address:</b> ${user.address}</p>
      <button onclick="markCompleted('${docSnap.id}')">Mark Completed</button>
      <a href="profile.html?id=${userRef.id}">View User Profile</a>
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
