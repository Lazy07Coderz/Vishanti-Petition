const params = new URLSearchParams(window.location.search);
const petitionId = params.get("id");

async function loadPetitionDetails() {
    try {
        const token = sessionStorage.getItem("authToken");

        if (!token) {
            window.location.href = "login.html";
            return;
        }

        if (!petitionId) {
            throw new Error("No petition ID found in the URL.");
        }

        const response = await fetch(
            `/api/complaints/${encodeURIComponent(petitionId)}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (response.status === 401 || response.status === 403) {
            sessionStorage.removeItem("authToken");
            window.location.href = "login.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Failed to load petition details.");
        }

        const petition = await response.json();

        document.querySelector("#detail-title").textContent =
            petition.title || "Untitled petition";

        document.querySelector("#detail-id").textContent =
            petition._id || petitionId;

        document.querySelector("#detail-category").textContent =
            petition.category || "Not specified";

        document.querySelector("#detail-status").textContent =
            getStatusLabel(petition.status || "Unknown");

        document.querySelector("#detail-description").textContent =
            petition.description || "No description available.";

        document.querySelector("#detail-priority").textContent =
            petition.priority || "Not specified";

    } catch (error) {
        console.error("Error loading petition:", error);
        alert(error.message || "Unable to load petition details.");
    }
}

function getStatusLabel(status) {
    const statusLabels = {
        FILED: "Filed",
        ASSIGNED: "Assigned",
        IN_REVIEW: "In Review",
        RESOLVED: "Resolved",
        ESCALATED: "Escalated"
    };

    return statusLabels[status] || status;
}

loadPetitionDetails();
