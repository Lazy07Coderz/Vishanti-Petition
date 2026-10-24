const petitionList = document.querySelector(".petition-list");
petitionList.innerHTML = "";

console.log(petitionList);

const petitions = [
  {
    id: "VP-001",
    title: "Hostel maintenance issue",
    category: "Hostel & Facilities",
    priority: "Medium",
    status: "IN_REVIEW"
  },
  {
    id: "VP-002",
    title: "Request for library hours extension",
    category: "Library",
    priority: "High",
    status: "RESOLVED"
  }
];

const totalPetitions = petitions.length;

console.log(totalPetitions);

const totalPetitionsElement = document.querySelector("#total-petitions");

totalPetitionsElement.textContent = totalPetitions;

const underReview = petitions.filter(function(petition) {
    return petition.status === "IN_REVIEW";
}).length;

console.log(underReview); 

const underReviewElement = document.querySelector("#under-review");

underReviewElement.textContent = underReview;

const resolved = petitions.filter(function(petition) {
    return petition.status === "RESOLVED";
}).length;

console.log(resolved);

const resolvedElement = document.querySelector("#resolved-count");

resolvedElement.textContent = resolved;

const awaitingAction = petitions.filter(function(petition) {
    return petition.status === "FILED" ||
           petition.status === "ASSIGNED";
}).length;

console.log(awaitingAction);

const awaitingActionElement = document.querySelector("#awaiting-action");

awaitingActionElement.textContent = awaitingAction; 

function renderPetitions() {
petitions.forEach(function(petition) {

const petitionCard = document.createElement("div");

const petitionDetails = document.createElement("div");
petitionDetails.classList.add("petition-details");

petitionCard.classList.add("petition-item");

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

renderPetitions();

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
