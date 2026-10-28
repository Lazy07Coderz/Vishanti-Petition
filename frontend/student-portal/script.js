const petitionList = document.querySelector(".petition-list");
petitionList.innerHTML = "";

console.log(petitionList);

let petitions = [];

async function loadPetitions() {
    try {
        const token = sessionStorage.getItem("authToken");

        if (!token) {
            window.location.href = "login.html";
            return;
        }

        const response = await fetch("/api/complaints/mine", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            sessionStorage.removeItem("authToken");
            window.location.href = "login.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Failed to load your petitions.");
        }

        const data = await response.json();

        petitions = data.map(function(complaint) {
            return {
                id: complaint._id,
                title: complaint.title,
                category: complaint.category,
                description: complaint.description,
                priority: complaint.priority || "Not specified",
                status: complaint.status
            };
        });

        renderPetitions();
        updateStatistics();

    } catch (error) {
        console.error("Error loading petitions:", error);
    }
}

function updateStatistics() {
    const totalPetitions = petitions.length;

    document.querySelector("#total-petitions").textContent =
        totalPetitions;

    const underReview = petitions.filter(function(petition) {
        return petition.status === "IN_REVIEW";
    }).length;

    document.querySelector("#under-review").textContent =
        underReview;

    const resolved = petitions.filter(function(petition) {
        return petition.status === "RESOLVED";
    }).length;

    document.querySelector("#resolved-count").textContent =
        resolved;

    const awaitingAction = petitions.filter(function(petition) {
        return petition.status === "FILED" ||
               petition.status === "ASSIGNED";
    }).length;

    document.querySelector("#awaiting-action").textContent =
        awaitingAction;
}

function renderPetitions() {
petitionList.innerHTML = "";    
petitions.forEach(function(petition) {

const petitionCard = document.createElement("div");

const petitionDetails = document.createElement("div");
petitionDetails.classList.add("petition-details");

petitionCard.classList.add("petition-item");

petitionCard.style.cursor = "pointer";

petitionCard.addEventListener("click", function() {
    window.location.href =
        `petition-details.html?id=${encodeURIComponent(petition.id)}`;
});

const petitionReference = document.createElement("p");
petitionReference.textContent = `Reference: ${petition.id}`;

const petitionTitle = document.createElement("h3");

petitionTitle.textContent = petition.title;

petitionDetails.appendChild(petitionReference);

petitionDetails.appendChild(petitionTitle);

const petitionDescription = document.createElement("p");

const petitionPriority = document.createElement("p");

petitionPriority.textContent = `Priority: ${petition.priority}`;

const petitionStatus = document.createElement("span");

petitionStatus.classList.add("petition-status");

const statusClass = getStatusClass(petition.status); 

if (statusClass) {
    petitionStatus.classList.add(statusClass);
}

petitionStatus.textContent = getStatusLabel(petition.status);

petitionDescription.textContent = `Category: ${petition.category}`;

petitionDetails.appendChild(petitionDescription);

petitionCard.appendChild(petitionDetails);

petitionCard.appendChild(petitionPriority);

petitionCard.appendChild(petitionStatus);

petitionList.appendChild(petitionCard);
});
}



function getStatusLabel(status) {
    if (status === "FILED") {
        return "Filed";
    }

    if (status === "ASSIGNED") {
        return "Assigned";
    }

    if (status === "IN_REVIEW") {
        return "Under review";
    }

    if (status === "RESOLVED") {
        return "Resolved";
    }

    if (status === "CLOSED") {
        return "Closed";
    }

    return status;
}

function getStatusClass(status) {
    if (status === "IN_REVIEW") {
        return "status-review";
    }

    if (status === "RESOLVED") {
        return "status-resolved";
    }

    return "";
}

loadPetitions();
