import { auth, db } from "./firebase.js";
import {
  doc, getDoc, getDocs, collection, query, where, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Initialize Dashboard
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("Not signed in. Redirecting...");
    window.location.href = "signin.html";
    return;
  }

  loadAllServiceProviders();
});

// ✅ Function to Load All Service Providers
async function loadAllServiceProviders() {
  const providersDiv = document.getElementById("service-providers");
  providersDiv.innerHTML = "";

  const q = query(collection(db, "users"), where("role", "==", "service_provider"));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    providersDiv.innerHTML = `<p>No Service Providers Available.</p>`;
    return;
  }

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const statusBadge = getStatusBadge(data.status);

    providersDiv.innerHTML += `
      <div class="provider-card">
        <p><b>Name:</b> ${data.name}</p>
        <p><b>Phone:</b> ${data.phone}</p>
        <p><b>Location:</b> ${data.address}</p>
        <p><b>Status:</b> ${statusBadge}</p>
        <p><b>Gov ID:</b> 
          ${data.govID 
            ? `<button onclick="previewGovID('${data.govID}')">View ID</button> 
               <button onclick="downloadGovID('${data.govID}')">Download ID</button>`
            : "Not Available"}
        </p>
        <button onclick="approveProvider('${doc.id}', '${data.email}')">✅ Approve</button>
        <button onclick="rejectProvider('${doc.id}', '${data.email}')">❌ Reject</button>
        <button onclick="deleteUser('${doc.id}')">🗑 Delete</button>
      </div>
      <hr>
    `;
  });
}

// ✅ Function to Get Status Badge
function getStatusBadge(status) {
  if (status === "Approved") {
    return `<span style="color:green;font-weight:bold;">✅ Verified</span>`;
  } else if (status === "Rejected") {
    return `<span style="color:red;font-weight:bold;">❌ Rejected</span>`;
  } else {
    return `<span style="color:orange;font-weight:bold;">⏳ Pending</span>`;
  }
}

// ✅ Function to Preview Gov ID
window.previewGovID = function(govID) {
  window.open(govID, "_blank");
}

// ✅ Function to Download Gov ID
window.downloadGovID = function(govID) {
  const link = document.createElement("a");
  link.href = govID;
  link.download = "GovID.pdf";
  link.click();
}

// ✅ Function to Approve Service Provider
window.approveProvider = async function(userId, email) {
  await updateDoc(doc(db, "users", userId), { status: "Approved" });
  sendEmail(email, "Approved", "Your account has been approved. You can now receive service requests.");
  alert("Service Provider Approved!");
  location.reload();
}

// ✅ Function to Reject Service Provider
window.rejectProvider = async function(userId, email) {
  await updateDoc(doc(db, "users", userId), { status: "Rejected" });
  sendEmail(email, "Rejected", "Your account has been rejected. Please contact support.");
  alert("Service Provider Rejected!");
  location.reload();
}

// ✅ Function to Delete User
window.deleteUser = async function(userId) {
  if (confirm("Are you sure you want to delete this provider?")) {
    await deleteDoc(doc(db, "users", userId));
    alert("Provider deleted successfully.");
    location.reload();
  }
}

// ✅ Function to Send Email (Approval/Rejection)
async function sendEmail(email, subject, message) {
  try {
    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: "service_xxxxxx",  // Replace with your EmailJS service ID
        template_id: "template_xxxxxx", // Replace with your EmailJS template ID
        user_id: "user_xxxxxx",  // Replace with your EmailJS user ID
        template_params: {
          email: email,
          subject: subject,
          message: message
        }
      })
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}
