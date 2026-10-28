"use strict";

/* =========================================
   SAMPLE PETITION DATA

   Replace these sample records with backend data later.
========================================= */

const petitions = [
    {
        id: "59D4EFC3",
        title: "Course timetable conflict",
        category: "Academics",
        status: "Escalated",
        priority: "Urgent",
        sla: "4m left",
        tier: 1,
        description:
            "Two compulsory courses have been scheduled at the same time. " +
            "Please review the timetable and arrange an alternative slot.",
        history: [
            {
                title: "Filed → Filed",
                time: "Oct 27, 2026, 11:42 PM",
                actor: "Student",
                reason: "Petition submitted."
            },
            {
                title: "Transition → Escalated",
                time: "Oct 27, 2026, 11:48 PM",
                actor: "Portal Administrator",
                reason: "Referred to the next authority for review."
            }
        ]
    },
    {
        id: "59D4EFB8",
        title: "Clarification on the fee receipt",
        category: "Finance",
        status: "Filed",
        priority: "Low",
        sla: "2h left",
        tier: 0,
        description:
            "The fee receipt includes an unexplained charge. " +
            "Please provide an itemized clarification.",
        history: [
            {
                title: "Filed → Filed",
                time: "Oct 27, 2026, 11:42 PM",
                actor: "Student",
                reason: "Petition submitted."
            }
        ]
    },
    {
        id: "59D4EF8B",
        title: "Hostel maintenance follow-up",
        category: "Hostel",
        status: "Resolved",
        priority: "High",
        sla: "Completed",
        tier: 0,
        description:
            "A follow-up on the reported water supply issue in the hostel. " +
            "Maintenance has completed the repair.",
        history: [
            {
                title: "Filed → Filed",
                time: "Oct 27, 2026, 11:42 PM",
                actor: "Student",
                reason: "Petition submitted."
            },
            {
                title: "Transition → Resolved",
                time: "Oct 27, 2026, 11:55 PM",
                actor: "Portal Administrator",
                reason: "Maintenance completed the reported repair."
            }
        ]
    },
    {
        id: "59D4EF69",
        title: "Broken desks in the computer lab",
        category: "Facilities",
        status: "In Review",
        priority: "Medium",
        sla: "44m left",
        tier: 0,
        description:
            "This is a fictional demonstration petition. Please investigate " +
            "the reported campus issue and provide a clear update on the " +
            "planned resolution.",
        history: [
            {
                title: "Filed → Filed",
                time: "Oct 27, 2026, 11:42 PM",
                actor: "Account d4eef8",
                reason: "Petition submitted."
            },
            {
                title: "Transition → Assigned",
                time: "Oct 27, 2026, 11:42 PM",
                actor: "Account d4ef02",
                reason: "Assigned to the campus officer."
            },
            {
                title: "Transition → In Review",
                time: "Oct 27, 2026, 11:42 PM",
                actor: "Account d4eefc",
                reason: "The issue is being investigated."
            }
        ]
    }
];

/* Shared sample fields */
petitions.forEach(function (petition) {
    petition.filed = "Oct 27, 2026, 11:42 PM";
    petition.filedDate = "10/27/2026";
    petition.deadline = "Oct 28, 2026, 12:30 AM";
    petition.version = petition.history.length;
});

/* =========================================
   ELEMENT REFERENCES
========================================= */

const getElement = id => document.getElementById(id);

const rows = getElement("petition-rows");
const filters = getElement("queue-filters");
const dialog = getElement("petition-dialog");
const updateForm = getElement("petition-update");

let selectedPetition = null;
let openingButton = null;

/* =========================================
   HELPER FUNCTIONS
========================================= */

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

function getStatusClass(status) {
    return "status-" + status.toLowerCase().replaceAll(" ", "-");
}

function createStatusBadge(status) {
    return createElement(
        "span",
        "status-badge " + getStatusClass(status),
        status
    );
}

/* =========================================
   DISPLAY THE WORK QUEUE
========================================= */

function renderQueue(announce = false) {
        // Notifications also uses this script, but has no queue table.
    if (!rows) {
        return;
    }
    const searchText = getElement("petition-search")
        .value.trim().toLowerCase();

    const selectedStatus = getElement("status-filter").value;
    const selectedCategory = getElement("category-filter").value;

    const filteredPetitions = petitions.filter(function (petition) {
        const titleMatches = petition.title
            .toLowerCase().includes(searchText);

        const statusMatches =
            selectedStatus === "all" ||
            petition.status === selectedStatus;

        const categoryMatches =
            selectedCategory === "all" ||
            petition.category === selectedCategory;

        return titleMatches && statusMatches && categoryMatches;
    });

    rows.replaceChildren();

    filteredPetitions.forEach(function (petition) {
        const row = createElement("tr");

        /* Title and petition number */
        const titleCell = createElement("td");

        const titleButton = createElement(
            "button",
            "petition-link",
            petition.title
        );

        titleButton.type = "button";
        titleButton.dataset.petitionId = petition.id;
        titleButton.setAttribute("aria-haspopup", "dialog");

        titleButton.addEventListener("click", function () {
            openPetition(petition, titleButton);
        });

        const reference = createElement(
            "span",
            "row-note",
            "#" + petition.id + " · " + petition.filedDate
        );

        titleCell.append(titleButton, reference);

        /* Category */
        const categoryCell = createElement(
            "td",
            "",
            petition.category
        );

        /* Status */
        const statusCell = createElement("td");
        statusCell.append(createStatusBadge(petition.status));

        /* Priority */
        const priorityCell = createElement("td");

        priorityCell.append(
            createElement(
                "span",
                "priority priority-" + petition.priority.toLowerCase(),
                petition.priority
            )
        );

        /* SLA and tier */
        const slaCell = createElement("td", "", petition.sla);

        slaCell.append(
            createElement(
                "span",
                "row-note",
                "Authority tier " + petition.tier
            )
        );

        row.append(
            titleCell,
            categoryCell,
            statusCell,
            priorityCell,
            slaCell
        );

        rows.append(row);
    });

    if (filteredPetitions.length === 0) {
        const emptyRow = createElement("tr");

        const emptyCell = createElement(
            "td",
            "empty-row",
            "No petitions match these filters."
        );

        emptyCell.colSpan = 5;

        emptyRow.append(emptyCell);
        rows.append(emptyRow);
    }

    if (announce) {
        const count = filteredPetitions.length;

        getElement("queue-feedback").textContent =
            count + " petition" +
            (count === 1 ? "" : "s") +
            " shown.";
    }
}

/* =========================================
   POPULATE PETITION DETAILS
========================================= */

function renderPetitionDetails() {
    const petition = selectedPetition;

    getElement("petition-id").textContent =
        "PETITION #" + petition.id;

    getElement("petition-title").textContent = petition.title;

    /* Metadata */
    const metadata = getElement("petition-meta");

    metadata.replaceChildren(
        createStatusBadge(petition.status)
    );

    const details = [
        petition.category,
        petition.priority + " priority",
        "Tier " + petition.tier,
        "Identified petitioner"
    ];

    details.forEach(function (detail) {
        metadata.append(createElement("span", "", detail));
    });

    getElement("petition-description").textContent =
        petition.description;

    getElement("petition-dates").textContent =
        "Filed " + petition.filed +
        " · Deadline " + petition.deadline +
        " · Version " + petition.version;

    getElement("audit-summary").textContent =
        "Demo audit trail · " +
        petition.history.length +
        " events · Unverified";

    /* Timeline */
    const timeline = getElement("audit-timeline");
    timeline.replaceChildren();

    petition.history.forEach(function (event) {
        const item = createElement("li", "audit-event");

        const heading = createElement(
            "h4",
            "",
            event.title
        );

        const metadata = createElement(
            "p",
            "event-meta",
            event.time + " · " + event.actor
        );

        item.append(heading, metadata);

        if (event.reason) {
            item.append(
                createElement(
                    "p",
                    "event-reason",
                    event.reason
                )
            );
        }

        timeline.append(item);
    });
}

/* =========================================
   OPEN AND CLOSE DIALOG
========================================= */

function openPetition(petition, button) {
    selectedPetition = petition;
    openingButton = button;

    updateForm.reset();

    getElement("decision-reason").setCustomValidity("");
    getElement("update-feedback").textContent = "";

    renderPetitionDetails();

    dialog.showModal();
    dialog.scrollTop = 0;

    getElement("close-petition").focus();
}

getElement("close-petition").addEventListener("click", function () {
    dialog.close();
});

/*
   The native dialog also supports Escape to close
   and keeps keyboard focus inside while open.
*/
dialog.addEventListener("close", function () {
    if (openingButton && openingButton.isConnected) {
        openingButton.focus();
    } else {
        getElement("petition-search")?.focus();
    }
});

/* =========================================
   SEARCH AND REFRESH
========================================= */

filters?.addEventListener("submit", function (event) {
    event.preventDefault();
    renderQueue(true);
});

getElement("refresh-queue")?.addEventListener("click", function () {
    renderQueue();

    getElement("queue-feedback").textContent =
        "Demo list refreshed. No server request was made.";
});

/* =========================================
   SAVE A DEMO UPDATE
========================================= */

updateForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const reasonInput = getElement("decision-reason");
    const reason = reasonInput.value.trim();

    reasonInput.setCustomValidity(
        reason ? "" : "Please enter a comment or decision reason."
    );

    if (!updateForm.reportValidity()) {
        return;
    }

    const action = getElement("petition-action").value;
    const petition = selectedPetition;

    if (action !== "comment" && action === petition.status) {
        getElement("update-feedback").textContent =
            "This petition is already " + petition.status +
            ". Choose Comment to add a note.";

        return;
    }

    if (action !== "comment") {
        petition.status = action;

        if (action === "Escalated") {
            petition.tier += 1;
        }

        if (action === "Resolved" || action === "Closed") {
            petition.sla = "Completed";
        } else {
            petition.sla = "Awaiting server SLA";
        }
    }

    petition.version += 1;

    petition.history.push({
        title:
            action === "comment"
                ? "Comment added"
                : "Transition → " + action,

        time: new Date().toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short"
        }),

        actor: "Portal Administrator (demo)",
        reason: reason
    });

    renderPetitionDetails();
    renderQueue(true);

    /*
       Rendering the table replaces its buttons.
       Find the new button to restore focus when the dialog closes.
    */
    // Only the Work queue page needs to find its newly rendered button.
// On Notifications, keep the original View button.
if (rows) {
    openingButton = Array.from(
        rows.querySelectorAll(".petition-link")
    ).find(function (button) {
        return button.dataset.petitionId === petition.id;
    }) || null;
}

    reasonInput.value = "";

    getElement("update-feedback").textContent =
        "Demo update added. It will be lost when this page is reloaded.";
});

getElement("decision-reason").addEventListener(
    "input",
    function (event) {
        event.target.setCustomValidity("");
    }
);

/* =========================================
   DOWNLOAD AUDIT JSON
========================================= */

getElement("download-audit").addEventListener("click", function () {
    if (!selectedPetition) {
        return;
    }

    const auditData = {
        demo: true,
        cryptographicallyVerified: false,
        petition: selectedPetition
    };

    const file = new Blob(
        [JSON.stringify(auditData, null, 2)],
        { type: "application/json" }
    );

    const fileURL = URL.createObjectURL(file);
    const downloadLink = document.createElement("a");

    downloadLink.href = fileURL;

    downloadLink.download =
        "petition-" + selectedPetition.id + "-demo-audit.json";

    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    setTimeout(function () {
        URL.revokeObjectURL(fileURL);
    }, 1000);
});

/* INITIAL DISPLAY */
renderQueue();