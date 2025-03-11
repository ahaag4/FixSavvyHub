import { auth, db } from "./firebase.js";
import {
  doc, getDoc, getDocs, collection, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("Not signed in. Redirecting...");
    window.location.href = "signin.html";
    return;
  }
  loadPendingRequests();
  loadApprovedRequests();
  loadUserManagement();
  loadPaymentVerification();
});

// ==========================
// ✅ 1. Load Pending Service Requests
// ==========================
async function loadPendingRequests() {
  const requestsDiv = document.getElementById("pending-requests");
  const snapshot = await getDocs(collection(db, "services"));

  snapshot.forEach(async (docSnap) => {
    const data = docSnap.data();
    if (data.status === "Pending") {
      requestsDiv.innerHTML += `
        <div>
          <p><b>Service:</b> ${data.serviceName}</p>
          <p><b>Requested By:</b> <a href="profile.html?id=${data.requestedBy}" target="_blank">View Profile</a></p>
          <p><b>Assigned To:</b> ${data.assignedTo ? `<a href="profile.html?id=${data.assignedTo}" target="_blank">View Profile</a>` : 'Not Assigned'}</p>
          <p><b>Status:</b> ${data.status}</p>
          <button onclick="approveService('${docSnap.id}')">Approve</button>
          <button onclick="rejectService('${docSnap.id}')">Reject</button>
        </div>
        <hr>
      `;
    }
  });
}

window.approveService = async (serviceId) => {
  await updateDoc(doc(db, "services", serviceId), { status: "Approved" });
  alert("Service Approved!");
  location.reload();
};

window.rejectService = async (serviceId) => {
  await updateDoc(doc(db, "services", serviceId), { status: "Rejected" });
  alert("Service Rejected!");
  location.reload();
};

// ==========================
// ✅ 2. Load Approved Gov ID Requests
// ==========================
async function loadApprovedRequests() {
  const approvedDiv = document.getElementById("approved-requests");
  const snapshot = await getDocs(collection(db, "users"));

  snapshot.forEach(async (docSnap) => {
    const data = docSnap.data();
    if (data.govID && data.role === "service_provider") {
      approvedDiv.innerHTML += `
        <div>
          <p><b>Name:</b> ${data.username}</p>
          <p><b>Gov ID:</b> <a href="${data.govID}" target="_blank">View ID</a></p>
          <button onclick="approveGov('${docSnap.id}')">Approve</button>
          <button onclick="rejectGov('${docSnap.id}')">Reject</button>
        </div>
        <hr>
      `;
    }
  });
}

window.approveGov = async (userId) => {
  await updateDoc(doc(db, "users", userId), { govIDStatus: "Approved" });
  alert("Gov ID Approved!");
  location.reload();
};

window.rejectGov = async (userId) => {
  await updateDoc(doc(db, "users", userId), { govIDStatus: "Rejected" });
  alert("Gov ID Rejected!");
  location.reload();
};

// ==========================
// ✅ 3. Load User & Service Provider Management
// ==========================
async function loadUserManagement() {
  const userDiv = document.getElementById("user-management");
  const snapshot = await getDocs(collection(db, "users"));

  snapshot.forEach(async (docSnap) => {
    const data = docSnap.data();
    userDiv.innerHTML += `
      <div>
        <p><b>Name:</b> ${data.username}</p>
        <p><b>Role:</b> ${data.role}</p>
        <p><b>Status:</b> ${data.isBlocked ? 'Blocked' : 'Active'}</p>
        <button onclick="blockUser('${docSnap.id}')">Block</button>
        <button onclick="unblockUser('${docSnap.id}')">Unblock</button>
      </div>
      <hr>
    `;
  });
}

window.blockUser = async (userId) => {
  await updateDoc(doc(db, "users", userId), { isBlocked: true });
  alert("User Blocked!");
  location.reload();
};

window.unblockUser = async (userId) => {
  await updateDoc(doc(db, "users", userId), { isBlocked: false });
  alert("User Unblocked!");
  location.reload();
};

// ==========================
// ✅ 4. Load Payment Verification
// ==========================
async function loadPaymentVerification() {
  const paymentDiv = document.getElementById("payment-verification");
  const snapshot = await getDocs(collection(db, "payments"));

  snapshot.forEach(async (docSnap) => {
    const data = docSnap.data();
    paymentDiv.innerHTML += `
      <div>
        <p><b>User:</b> ${data.userId}</p>
        <p><b>Amount:</b> ${data.amount}</p>
        <p><b>Status:</b> ${data.status}</p>
        <button onclick="verifyPayment('${docSnap.id}')">Verify</button>
      </div>
      <hr>
    `;
  });
}

window.verifyPayment = async (paymentId) => {
  await updateDoc(doc(db, "payments", paymentId), { status: "Verified" });
  alert("Payment Verified!");
  location.reload();
};
                   
