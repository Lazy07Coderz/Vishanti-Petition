
(() => {
    "use strict";

    const byId = id => document.getElementById(id);

    const list = byId("my-petitions");
    const refreshButton = byId("refresh-dashboard");

    let myPetitions = [];
    let loading = false;

    const statusLabels = {
        FILED: "Filed",
        ASSIGNED: "Assigned",
        IN_REVIEW: "Under review",
        RESOLVED: "Resolved",
        CLOSED: "Closed"
    };

    function setText(id, text) {
        const target = byId(id);

        if (target) {
            target.textContent = text;
        }
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);

        if (className) {
            node.className = className;
        }

        if (text !== undefined) {
            node.textContent = String(text);
        }

        return node;
    }

    function dateIST(value) {
        if (!value) {
            return "Date unavailable";
        }

        const date = new Date(value);

        if (!Number.isFinite(date.getTime())) {
            return "Date unavailable";
        }

        return new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date) + " IST";
    }

    function statusOf(petition) {
        return String(petition.status || "")
            .toUpperCase();
    }

    function slaLabel(petition) {
        const status = statusOf(petition);

        if (
            status === "RESOLVED" ||
            status === "CLOSED"
        ) {
            return "Completed";
        }

        if (!petition.slaDeadline) {
            return "SLA not available";
        }

        const remaining =
            new Date(petition.slaDeadline).getTime() -
            Date.now();

        if (!Number.isFinite(remaining)) {
            return "SLA not available";
        }

        const minutes = Math.max(
            1,
            Math.ceil(Math.abs(remaining) / 60000)
        );

        const days = Math.floor(minutes / 1440);

        const hours = Math.floor(
            (minutes % 1440) / 60
        );

        const mins = minutes % 60;

        const duration = [
            days ? `${days}d` : "",
            hours ? `${hours}h` : "",
            mins ? `${mins}m` : ""
        ].filter(Boolean).join(" ");

        return remaining <= 0
            ? `Overdue by ${duration}`
            : `${duration} remaining`;
    }

    function renderPetitions() {
        list.replaceChildren();

        if (!myPetitions.length) {
            const empty = el(
                "div",
                "petition-item empty-petitions"
            );

            empty.append(
                el(
                    "h3",
                    "",
                    "No petitions filed yet"
                ),
                el(
                    "p",
                    "",
                    "Your submitted petitions will appear here."
                )
            );

            const link = el(
                "a",
                "new-petition-link",
                "File your first petition"
            );

            link.href = "file-petition.html";

            empty.append(link);
            list.append(empty);

            return;
        }

        for (const petition of myPetitions) {
            const card = el(
                "a",
                "petition-item"
            );

            card.href =
                `petition-details.html?id=${encodeURIComponent(String(petition._id))}`;

            const details = el(
                "div",
                "petition-details"
            );

            details.append(
                el(
                    "p",
                    "",
                    `Reference: ${petition._id}`
                ),

                el(
                    "h3",
                    "",
                    petition.title || "Untitled petition"
                ),

                el(
                    "p",
                    "",
                    `Category: ${petition.category || "Other"}`
                ),

                el(
                    "p",
                    "",
                    `Filed: ${dateIST(petition.createdAt)}`
                )
            );

            const right = el(
                "div",
                "petition-right"
            );

            right.append(
                el(
                    "p",
                    "petition-priority",
                    `Priority: ${petition.priority || "Medium"}`
                )
            );

            const status = statusOf(petition);

            const statusClass =
                status === "IN_REVIEW"
                    ? "status-review"
                    : ["RESOLVED", "CLOSED"].includes(status)
                        ? "status-resolved"
                        : "";

            right.append(
                el(
                    "span",
                    `petition-status ${statusClass}`.trim(),
                    statusLabels[status] ||
                    status ||
                    "Unknown"
                )
            );

            const countdown = el(
                "span",
                "sla-countdown",
                slaLabel(petition)
            );

            if (
                countdown.textContent.startsWith("Overdue")
            ) {
                countdown.classList.add(
                    "sla-overdue"
                );
            }

            right.append(countdown);

            card.append(details, right);

            list.append(card);
        }
    }

    async function getJSON(url, token) {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            sessionStorage.removeItem(
                "authToken"
            );

            window.location.replace(
                "login.html"
            );

            throw new Error(
                "Session expired. Please sign in again."
            );
        }

        const data = await response.json()
            .catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message ||
                `Request failed (${response.status})`
            );
        }

        return data;
    }

    function showStats(stats) {
        const counts = {
            "total-petitions": stats.total,
            "under-review": stats.inReview,
            "resolved-count": stats.resolved,
            "awaiting-action": stats.pending
        };

        for (const [id, count] of Object.entries(counts)) {
            setText(
                id,
                Number.isInteger(count) && count >= 0
                    ? count
                    : "—"
            );
        }
    }

    async function loadDashboard() {
        if (loading) return;

        const token = sessionStorage.getItem(
            "authToken"
        );

        if (!token) {
            window.location.replace(
                "login.html"
            );

            return;
        }

        loading = true;
        refreshButton.disabled = true;

        setText(
            "stats-feedback",
            "Loading campus statistics..."
        );

        setText(
            "petitions-feedback",
            "Loading your petitions..."
        );

        try {
            const [statsResult, petitionsResult] =
                await Promise.allSettled([
                    getJSON(
                        "/api/complaints/stats",
                        token
                    ),

                    getJSON(
                        "/api/complaints/mine",
                        token
                    )
                ]);

            if (statsResult.status === "fulfilled") {
                showStats(statsResult.value);

                setText(
                    "stats-feedback",
                    "Institution-wide statistics (all students)."
                );

            } else {
                showStats({});

                setText(
                    "stats-feedback",
                    `Could not load statistics: ${statsResult.reason.message}`
                );
            }

            if (
                petitionsResult.status === "fulfilled" &&
                Array.isArray(petitionsResult.value)
            ) {
                myPetitions = petitionsResult.value;

                renderPetitions();

                setText(
                    "petitions-feedback",
                    `${myPetitions.length} of your petition(s).`
                );

            } else {
                myPetitions = [];
                list.replaceChildren();

                const errorMessage =
                    petitionsResult.status === "rejected"
                        ? petitionsResult.reason.message
                        : "Invalid petition response";

                setText(
                    "petitions-feedback",
                    `Could not load your petitions: ${errorMessage}`
                );
            }

        } finally {
            loading = false;
            refreshButton.disabled = false;
        }
    }

    byId("student-logout").addEventListener(
        "click",
        () => {
            sessionStorage.removeItem(
                "authToken"
            );

            window.location.replace(
                "login.html"
            );
        }
    );

    refreshButton.addEventListener(
        "click",
        loadDashboard
    );

    setInterval(() => {
        if (
            !loading &&
            myPetitions.length
        ) {
            renderPetitions();
        }
    }, 60000);

    loadDashboard();
})();
