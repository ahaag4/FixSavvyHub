import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { db } from "./firebase.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Initialize Auth
const auth = getAuth();
const signupForm = document.getElementById("signup-form");

// ✅ Populate State, District, and Sub-District Data
const locationData = {
  "Maharashtra": {
    "Mumbai": ["Andheri", "Bandra", "Dadar", "Borivali"],
    "Pune": ["Shivajinagar", "Hinjewadi", "Kothrud"],
  },
  "Uttar Pradesh": {
    "Lucknow": ["Gomti Nagar", "Aliganj", "Hazratganj"],
    "Kanpur": ["Panki", "Govind Nagar", "Tilak Nagar"],
  }
};

const stateSelect = document.getElementById("state");
const districtSelect = document.getElementById("district");
const subDistrictSelect = document.getElementById("sub-district");

// ✅ Populate States
Object.keys(locationData).forEach(state => {
  const option = document.createElement("option");
  option.value = state;
  option.textContent = state;
  stateSelect.appendChild(option);
});

// ✅ Populate Districts Based on State Selection
stateSelect.addEventListener("change", () => {
  districtSelect.innerHTML = `<option value="" disabled selected>Select District</option>`;
  subDistrictSelect.innerHTML = `<option value="" disabled selected>Select Sub-District</option>`;

  const selectedState = stateSelect.value;
  if (selectedState) {
    Object.keys(locationData[selectedState]).forEach(district => {
      const option = document.createElement("option");
      option.value = district;
      option.textContent = district;
      districtSelect.appendChild(option);
    });
  }
});

// ✅ Populate Sub-Districts Based on District Selection
districtSelect.addEventListener("change", () => {
  subDistrictSelect.innerHTML = `<option value="" disabled selected>Select Sub-District</option>`;

  const selectedState = stateSelect.value;
  const selectedDistrict = districtSelect.value;

  if (selectedState && selectedDistrict) {
    locationData[selectedState][selectedDistrict].forEach(subDistrict => {
      const option = document.createElement("option");
      option.value = subDistrict;
      option.textContent = subDistrict;
      subDistrictSelect.appendChild(option);
    });
  }
});

// ✅ Signup Form Submission
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const state = document.getElementById("state").value;
  const district = document.getElementById("district").value;
  const subDistrict = document.getElementById("sub-district").value;
  const role = document.getElementById("role").value;

  if (!state || !district || !subDistrict) {
    alert("Please select your location properly.");
    return;
  }

  try {
    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Save user data to Firestore
    await setDoc(doc(db, "users", user.uid), {
      email: email,
      state: state,
      district: district,
      subDistrict: subDistrict,
      role: role,
    });

    alert("Signup successful!");
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Signup error:", error.message);
    alert("Signup failed: " + error.message);
  }
});
    
