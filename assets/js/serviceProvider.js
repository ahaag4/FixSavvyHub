import { auth, db } from "./firebase.js";
import {
  doc, setDoc, getDoc, getDocs, collection, query, where, updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let providerId;
let assignedServiceId;

// ✅ Check authentication
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("You are not signed in. Redirecting...");
    window.location.href = "signin.html";
    return;
  }

  providerId = user.uid;
  await loadProviderProfile();
  await loadAssignedServices();
});

// ==========================
// ✅ Section 1: Complete Profile
// ==========================
async function loadProviderProfile() {
  const userDoc = await getDoc(doc(db, "users", providerId));

  if (userDoc.exists()) {
    const userData = userDoc.data();
    document.getElementById("username").value = userData.username;
    document.getElementById("phone").value = userData.phone;
    document.getElementById("address").value = userData.address;
    
    if (userData.govID) {
      document.getElementById("gov-id-link").href = userData.govID;
      document.getElementById("gov-id-section").style.display = "block";
    }

    if (userData.phone && userData.address && userData.govID) {
      document.getElementById("section-1").classList.add("hidden");
      document.getElementById("section-2").classList.remove("hidden");
    }
  }
}

document.getElementById("profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const phone = document.getElementById("phone").value;
  const address = document.getElementById("address").value;
  const govIDFile = document.getElementById("gov-id").files[0];

  if (!govIDFile) {
    alert("Please upload Government ID.");
    return;
  }

  await setDoc(doc(db, "users", providerId), {
    username,
    phone,
    address,
    govID: URL.createObjectURL(govIDFile),
    role: "service_provider"
  }, { merge: true });

  alert("Profile Updated!");
  location.reload();
});

// ==========================
// ✅ Section 2: Assigned Services
// ==========================
async function loadAssignedServices() {
  const q = query(collection(db, "services"), where("assignedTo", "==", providerId));
  const services = await getDocs(q);

  const serviceContainer = document.getElementById("assigned-service");
  serviceContainer.innerHTML = "";

  services.forEach(async (docSnap) => {
    const data = docSnap.data();
    const userProfile = await getDoc(doc(db, "users", data.requestedBy));

    assignedServiceId = docSnap.id;

    serviceContainer.innerHTML += `
      <p><b>Service:</b> ${data.serviceName}</p>
      <p><b>Status:</b> ${data.status}</p>
      <p><b>Requested By:</b> 
      <a href="profile.html?id=${userProfile.id}" target="_blank">View Profile</a></p>
      <button onclick="markCompleted('${docSnap.id}')">Mark as Completed</button>
    `;
  });
}

// ✅ Mark Service as Completed
window.markCompleted = async (serviceId) => {
  await updateDoc(doc(db, "services", serviceId), { status: "Completed" });
  alert("Service marked as completed.");
  location.reload();
};

// ✅ View Own Profile
document.getElementById("view-own-profile").addEventListener("click", () => {
  window.location.href = `profile.html`;
});
