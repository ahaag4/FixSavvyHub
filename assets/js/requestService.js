async function requestService(serviceName, location) {
  const userId = auth.currentUser.uid; // Ensure user is logged in
  const serviceData = {
    serviceName,
    requestedBy: userId,
    location,
    status: "Pending",
    assignedTo: null, // To be assigned automatically
    createdAt: new Date().toISOString(),
  };

  try {
    await addDoc(collection(db, "services"), serviceData);
    console.log("Service request created:", serviceData);
  } catch (error) {
    console.error("Error creating service request:", error);
  }
}
