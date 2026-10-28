
(() => {
    "use strict";

    const byId = id => document.getElementById(id);

    const petitionId = new URLSearchParams(
        window.location.search
    ).get("id");

    const refreshButton = byId("refresh-details");

    const statusFlow = [
        "FILED",
        "ASSIGNED",
        "IN_REVIEW",
        "RESOLVED",
        "CLOSED"
    ];

    const statusLabels = {
        FILED: "Filed",
        ASSIGNED: "Assigned",
        IN_REVIEW: "In Review",
        RESOLVED: "Resolved",
        CLOSED: "Closed"
    };

    const slaHours = {
        High: 24,
        Medium: 48,
        Low: 72
    };

    let currentPetition = null;
    let loading = false;

    function setText(id, value) {
        const target = byId(id);

        if (target) {
            target.textContent = value;
        }
    }

    function create(tag, className = "", text = "") {
        const item = document.createElement(tag);

        if (className) {
            item.className = className;
        }

        item.textContent = String(text);

        return item;
    }

    function formatIST(value) {
        if (!value) return "Not available";

        const date = new Date(value);

        if (!Number.isFinite(date.getTime())) {
            return "Not available";
        }

        return new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date) + " IST";
    }

    function duration(ms) {
        const minutes = Math.max(
            1,
            Math.ceil(Math.abs(ms) / 60000)
        );

        const days = Math.floor(minutes / 1440);
        const hours = Math.floor((minutes % 1440) / 60);
        const mins = minutes % 60;

        return [
            days ? `${days}d` : "",
            hours ? `${hours}h` : "",
            mins || (!days && !hours) ? `${mins}m` : ""
        ].filter(Boolean).join(" ");
    }

    function renderProgress(status) {
        const list = byId("status-steps");

        if (!list) return;

        list.replaceChildren();

        const currentIndex = statusFlow.indexOf(status);

        if (currentIndex === -1) {
            list.append(
                create(
                    "li",
                    "",
                    "Current progress is unavailable."
                )
            );
            return;
        }

        statusFlow.forEach((step, index) => {
            const completed = index < currentIndex;
            const current = index === currentIndex;

            const item = create(
                "li",
                completed
                    ? "step-done"
                    : current
                        ? "step-current"
                        : "step-upcoming"
            );

            const icon = create(
                "span",
                "progress-icon",
                completed || (
                    current && status === "CLOSED"
                )
                    ? "✓"
                    : String(index + 1)
            );

            icon.setAttribute("aria-hidden", "true");

            const text = create(
                "div",
                "progress-text"
            );

            text.append(
                create(
                    "strong",
                    "",
                    statusLabels[step]
                )
            );

            if (current) {
                text.append(
                    create(
                        "small",
                        "",
                        status === "CLOSED"
                            ? "Final status"
                            : "Current status"
                    )
                );

                item.setAttribute(
                    "aria-current",
                    "step"
                );
            }

            item.append(icon, text);
            list.append(item);
        });
    }

    function renderSLA(petition) {
        const target = byId("detail-sla-status");

        if (!target) return;

        const status = String(
            petition.status || ""
        ).trim().toUpperCase();

        const priority = petition.priority || "Medium";

        setText(
            "detail-deadline",
            formatIST(petition.slaDeadline)
        );

        setText(
            "detail-sla-policy",
            slaHours[priority]
                ? `${priority} priority · ${slaHours[priority]}-hour SLA`
                : "SLA information unavailable"
        );

        target.className = "sla-value";

        if (["RESOLVED", "CLOSED"].includes(status)) {
            target.textContent = "Completed";
            target.classList.add("complete");
            return;
        }

        if (!petition.slaDeadline) {
            target.textContent = "Deadline unavailable";
            return;
        }

        const remaining =
            new Date(petition.slaDeadline).getTime() -
            Date.now();

        if (!Number.isFinite(remaining)) {
            target.textContent = "Deadline unavailable";
            return;
        }

        if (remaining <= 0) {
            target.textContent =
                `Overdue by ${duration(remaining)}`;

            target.classList.add("overdue");

        } else {
            target.textContent =
                `${duration(remaining)} remaining`;
        }
    }

    function renderPetition(petition) {
        currentPetition = petition;

        const status = String(
            petition.status || ""
        ).trim().toUpperCase();

        const anonymous =
            petition.anonymous === true ||
            String(petition.anonymous).toUpperCase() === "YES";

        setText(
            "detail-title",
            petition.title || "Untitled petition"
        );

        setText("detail-id", petition._id);

        setText(
            "detail-category",
            petition.category || "Not specified"
        );

        setText(
            "detail-priority",
            petition.priority || "Medium"
        );

        setText(
            "detail-status",
            statusLabels[status] || "Unknown"
        );

        setText(
            "detail-created",
            formatIST(petition.createdAt)
        );

        setText(
            "detail-updated",
            formatIST(petition.updatedAt)
        );

        setText(
            "detail-anonymous",
            anonymous ? "Yes" : "No"
        );

        setText(
            "detail-evidence",
            petition.evidence
                ? "Evidence attached"
                : "No evidence uploaded"
        );

        setText(
            "detail-description",
            petition.description || "No description provided."
        );

        setText(
            "detail-reason",
            petition.lastDecisionReason ||
            "No decision recorded yet."
        );

        const statusBadge = byId("detail-status");

        if (statusBadge) {
            statusBadge.className =
                `status-pill status-${status.toLowerCase()}`;
        }

        renderProgress(status);
        renderSLA(petition);

        byId("details-content").hidden = false;
    }

    function eventInformation(event) {
        const details = event.details || {};

        switch (event.type) {
            case "CREATED":
                return {
                    title: "Petition filed",
                    description:
                        `Your petition was submitted with ${details.priority || "Medium"} priority.`
                };

            case "BASELINE":
                return {
                    title: "Audit tracking started",
                    description:
                        "This petition existed before audit tracking began. Earlier actions are not recorded."
                };

            case "PRIORITY_CHANGED":
                return {
                    title: "Priority updated",
                    description:
                        `Priority changed from ${details.previousPriority || "Unknown"} to ${details.priority || "Unknown"}.`
                };

            case "STATUS_CHANGED": {
                const status = String(
                    details.status || ""
                ).toUpperCase();

                const title = {
                    ASSIGNED: "Petition assigned",
                    IN_REVIEW: "Petition under review",
                    RESOLVED: "Petition resolved",
                    CLOSED: "Petition closed"
                }[status] || "Petition status updated";

                return {
                    title,
                    description:
                        details.reason
                            ? `Decision: ${details.reason}`
                            : "The petition status was updated."
                };
            }

            case "SLA_OVERDUE":
                return {
                    title: "Resolution deadline exceeded",
                    description:
                        "The petition passed its assigned resolution deadline."
                };

            default:
                return {
                    title: "Petition updated",
                    description: "An activity was recorded."
                };
        }
    }

    function renderAudit(result) {
        const summary = byId("audit-verification");
        const list = byId("petition-audit-events");

        if (!summary || !list) return;

        list.replaceChildren();

        summary.className = "audit-verification";

        const events = Array.isArray(result.events)
            ? result.events
            : [];

        const hasBaseline = events.some(
            event => event.type === "BASELINE"
        );

        if (result.legacyUntracked === true) {
            summary.textContent =
                "Audit tracking has not started for this older petition.";

        } else if (result.verified === true) {
            summary.classList.add("verified");

            summary.textContent =
                `✓ Recorded activity verified · ${events.length} event${events.length === 1 ? "" : "s"}`;

            if (hasBaseline) {
                summary.textContent +=
                    " · Earlier activity unavailable";
            }

        } else {
            summary.classList.add("warning");

            summary.textContent =
                "⚠ Audit integrity check failed";
        }

        if (events.length === 0) {
            list.append(
                create(
                    "li",
                    "",
                    "No recorded events available."
                )
            );
            return;
        }

        for (const event of events) {
            const information = eventInformation(event);

            const item = create("li");

            const title = create(
                "div",
                "audit-event-title",
                information.title
            );

            const role = event.actorRole === "ADMIN"
                ? "Administrator"
                : event.actorRole === "STUDENT"
                    ? "Student"
                    : "System";

            const timestamp = create(
                "time",
                "audit-event-time",
                `${formatIST(event.occurredAt)} · ${role}`
            );

            if (event.occurredAt) {
                timestamp.dateTime = event.occurredAt;
            }

            const description = create(
                "p",
                "audit-event-description",
                information.description
            );

            item.append(
                title,
                timestamp,
                description
            );

            list.append(item);
        }
    }

    async function api(path) {
        const token = sessionStorage.getItem(
            "authToken"
        );

        if (!token) {
            window.location.replace("/login.html");
            throw new Error("Please sign in.");
        }

        const response = await fetch(path, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            sessionStorage.removeItem("authToken");

            window.location.replace("/login.html");

            throw new Error("Your session has expired.");
        }

        const result = await response.json()
            .catch(() => ({}));

        if (!response.ok) {
            if (
                response.status === 403 ||
                response.status === 404
            ) {
                throw new Error(
                    "Petition not found or access denied."
                );
            }

            throw new Error(
                result.message ||
                `Request failed (${response.status})`
            );
        }

        return result;
    }

    async function loadPetition() {
        if (loading) return;

        if (
            !petitionId ||
            !/^[a-f\d]{24}$/i.test(petitionId)
        ) {
            setText(
                "detail-feedback",
                "Invalid petition ID. Please open a petition from your dashboard."
            );
            return;
        }

        loading = true;

        if (refreshButton) {
            refreshButton.disabled = true;
        }

        setText(
            "detail-feedback",
            "Loading petition details..."
        );

        try {
            const petition = await api(
                `/api/complaints/${encodeURIComponent(petitionId)}`
            );

            if (petition?._id !== petitionId) {
                throw new Error(
                    "Unexpected petition returned by the server."
                );
            }

            renderPetition(petition);

            setText(
                "detail-feedback",
                "Petition information updated."
            );

            const auditSummary = byId("audit-verification");
            const auditList = byId("petition-audit-events");

            if (auditSummary) {
                auditSummary.className = "audit-verification";
                auditSummary.textContent =
                    "Checking recorded activity...";
            }

            if (auditList) {
                auditList.replaceChildren();
            }

            try {
                const history = await api(
                    `/api/complaints/${encodeURIComponent(petitionId)}/audit`
                );

                renderAudit(history);

            } catch (error) {
                if (auditSummary) {
                    auditSummary.className =
                        "audit-verification warning";

                    auditSummary.textContent =
                        `Audit history unavailable: ${error.message}`;
                }

                console.error(error);
            }

        } catch (error) {
            currentPetition = null;

            byId("details-content").hidden = true;

            setText(
                "detail-feedback",
                error.message
            );

            console.error(error);

        } finally {
            loading = false;

            if (refreshButton) {
                refreshButton.disabled = false;
            }
        }
    }

    refreshButton?.addEventListener(
        "click",
        loadPetition
    );

    setInterval(() => {
        if (currentPetition && !loading) {
            renderSLA(currentPetition);
        }
    }, 60000);

    void loadPetition();
})();
