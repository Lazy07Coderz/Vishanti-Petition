
(() => {
    "use strict";

    const byId = id => document.getElementById(id);
    const rows = byId("petition-rows");
    const dialog = byId("petition-dialog");
    const priorityForm = byId("priority-form") || byId("priority-update");
    const statusForm = byId("petition-update");

    const labels = {
        FILED: "Filed",
        ASSIGNED: "Assigned",
        IN_REVIEW: "In Review",
        RESOLVED: "Resolved",
        CLOSED: "Closed"
    };

    const transitions = {
        FILED: "ASSIGNED",
        ASSIGNED: "IN_REVIEW",
        IN_REVIEW: "RESOLVED",
        RESOLVED: "CLOSED"
    };

    const eventLabels = {
        CREATED: "Petition filed",
        BASELINE: "Legacy audit baseline",
        PRIORITY_CHANGED: "Priority changed",
        STATUS_CHANGED: "Status changed",
        SLA_OVERDUE: "SLA deadline exceeded"
    };

    let petitions = [];
    let selectedId = null;
    let lastFocused = null;
    let auditRequestId = 0;
    let queueBusy = false;

    if (!rows || !dialog) {
        console.error(
            "Work Queue requires petition-rows and petition-dialog."
        );
        return;
    }

    function setText(id, value) {
        const target = byId(id);
        if (target) target.textContent = value;
    }

    function node(tag, className = "", text = "") {
        const item = document.createElement(tag);
        if (className) item.className = className;
        item.textContent = String(text);
        return item;
    }

    function statusOf(value) {
        return String(value || "")
            .trim()
            .toUpperCase()
            .replace(/[\s-]+/g, "_");
    }

    function ist(value) {
        if (!value) return "Not available";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Not available";
        }

        return new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date) + " IST";
    }

    function sla(petition) {
        if (["RESOLVED", "CLOSED"].includes(
            statusOf(petition.status)
        )) {
            return "Completed";
        }

        if (!petition.slaDeadline) {
            return "Deadline unavailable";
        }

        const difference =
            new Date(petition.slaDeadline).getTime() - Date.now();

        if (!Number.isFinite(difference)) {
            return "Invalid deadline";
        }

        const minutes = Math.ceil(
            Math.abs(difference) / 60000
        );

        const days = Math.floor(minutes / 1440);
        const hours = Math.floor((minutes % 1440) / 60);
        const mins = minutes % 60;

        const duration = [
            days ? `${days}d` : "",
            hours ? `${hours}h` : "",
            mins || (!days && !hours) ? `${mins}m` : ""
        ].filter(Boolean).join(" ");

        return difference <= 0
            ? `Overdue by ${duration}`
            : `${duration} remaining`;
    }

    async function api(path, options = {}) {
        const token = sessionStorage.getItem("authToken");

        if (!token) {
            location.replace("/login.html");
            throw new Error(
                "Please sign in as administrator."
            );
        }

        const response = await fetch(path, {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(options.headers || {})
            }
        });

        if (response.status === 401) {
            sessionStorage.removeItem("authToken");

            location.replace("/login.html");

            throw new Error(
                "Your session expired. Please sign in again."
            );
        }

        const result = await response.json()
            .catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                result.message ||
                `Request failed (${response.status})`
            );
        }

        return result;
    }

    const selected = () =>
        petitions.find(p => p._id === selectedId);

    const priorityButton = () =>
        byId("save-priority") ||
        priorityForm?.querySelector('button[type="submit"]');

    const statusButton = () =>
        byId("save-update") ||
        byId("save-status") ||
        statusForm?.querySelector('button[type="submit"]');

    function renderQueue() {
        const search = (
            byId("petition-search")?.value || ""
        ).trim().toLowerCase();

        const statusFilter = statusOf(
            byId("status-filter")?.value || "all"
        );

        const categoryFilter =
            byId("category-filter")?.value || "all";

        const matched = petitions.filter(p =>
            String(p.title || "").toLowerCase().includes(search) &&
            (
                statusFilter === "ALL" ||
                statusOf(p.status) === statusFilter
            ) &&
            (
                categoryFilter === "all" ||
                p.category === categoryFilter
            )
        );

        rows.replaceChildren();

        for (const petition of matched) {
            const tr = node("tr");
            const titleCell = node("td");

            const button = node(
                "button",
                "petition-link",
                petition.title || "Untitled petition"
            );

            button.type = "button";
            button.setAttribute("aria-haspopup", "dialog");

            button.addEventListener("click", () => {
                lastFocused = button;
                openPetition(petition._id);
            });

            titleCell.append(
                button,
                node(
                    "span",
                    "row-note",
                    `#${String(petition._id).slice(-8)} · ${ist(petition.createdAt)}`
                )
            );

            const status = statusOf(petition.status);
            const statusCell = node("td");

            statusCell.append(
                node(
                    "span",
                    `status-badge status-${status.toLowerCase().replaceAll("_", "-")}`,
                    labels[status] || status || "Unknown"
                )
            );

            const priority = petition.priority || "Medium";
            const priorityCell = node("td");

            priorityCell.append(
                node(
                    "span",
                    `priority priority-${priority.toLowerCase()}`,
                    priority
                )
            );

            const countdown = sla(petition);

            const slaCell = node(
                "td",
                countdown.startsWith("Overdue") ? "sla-overdue" : "",
                countdown
            );

            slaCell.dataset.slaId = petition._id;

            tr.append(
                titleCell,
                node("td", "", petition.category || "Other"),
                statusCell,
                priorityCell,
                slaCell
            );

            rows.append(tr);
        }

        if (!matched.length) {
            const tr = node("tr");

            const cell = node(
                "td",
                "empty-row",
                "No petitions match these filters."
            );

            cell.colSpan = 5;
            tr.append(cell);
            rows.append(tr);
        }

        setText(
            "queue-feedback",
            `${matched.length} petition(s) shown.`
        );
    }

    function refreshCountdowns() {
        for (const cell of rows.querySelectorAll("[data-sla-id]")) {
            const petition = petitions.find(
                p => p._id === cell.dataset.slaId
            );

            if (!petition) continue;

            const value = sla(petition);

            cell.textContent = value;

            cell.classList.toggle(
                "sla-overdue",
                value.startsWith("Overdue")
            );
        }

        if (dialog.open && selected()) {
            const petition = selected();

            setText(
                "petition-dates",
                `Filed: ${ist(petition.createdAt)} · SLA: ${sla(petition)} · Deadline: ${ist(petition.slaDeadline)}`
            );
        }
    }

    function renderDetails() {
        const petition = selected();
        if (!petition) return;

        const status = statusOf(petition.status);
        const priority = petition.priority || "Medium";
        const next = transitions[status];

        const completed = [
            "RESOLVED",
            "CLOSED"
        ].includes(status);

        setText(
            "petition-id",
            `PETITION #${String(petition._id).slice(-8)}`
        );

        setText(
            "petition-title",
            petition.title || "Untitled petition"
        );

        setText(
            "petition-description",
            petition.description || "No description supplied."
        );

        const meta = byId("petition-meta");

        if (meta) {
            meta.replaceChildren(
                node("span", "", labels[status] || status),
                node("span", "", petition.category || "Other"),
                node("span", "", `${priority} priority`),
                node(
                    "span",
                    "",
                    petition.anonymous
                        ? "Anonymous petition"
                        : "Petition"
                )
            );
        }

        refreshCountdowns();

        const prioritySelect = byId("priority-select");

        if (prioritySelect) {
            prioritySelect.value = priority;
            prioritySelect.disabled = completed;
        }

        if (priorityButton()) {
            priorityButton().disabled = completed;
        }

        const action = byId("petition-action");

        if (action) {
            action.replaceChildren(
                new Option(
                    next
                        ? `Move to ${labels[next]}`
                        : "No further status changes",
                    next || ""
                )
            );

            action.disabled = !next;
        }

        if (statusButton()) {
            statusButton().disabled = !next;
        }

        const reason = byId("decision-reason");

        if (reason) {
            reason.disabled = !next;
            reason.required = Boolean(next);
        }
    }

    function eventDescription(event) {
        const d = event.details || {};

        switch (event.type) {
            case "CREATED":
                return `Category: ${d.category || "Unknown"}. Initial priority: ${d.priority || "Unknown"}. Deadline: ${ist(d.slaDeadline)}.`;

            case "BASELINE":
                return "Existing petition when auditing began. Earlier actions cannot be verified.";

            case "PRIORITY_CHANGED":
                return `${d.previousPriority || "Unknown"} → ${d.priority || "Unknown"}. New deadline: ${ist(d.slaDeadline)}.`;

            case "STATUS_CHANGED":
                return `${labels[d.previousStatus] || d.previousStatus || "Unknown"} → ${labels[d.status] || d.status || "Unknown"}. Reason: ${d.reason || "Not supplied"}`;

            case "SLA_OVERDUE":
                return `Deadline passed: ${ist(d.deadline)}. Priority: ${d.priority || "Unknown"}.`;

            default:
                return "Recorded petition activity.";
        }
    }

    function renderAudit(data) {
        const timeline = byId("audit-timeline");

        if (!timeline) return;

        timeline.replaceChildren();

        const untracked = data.legacyUntracked === true;

        const text = untracked
            ? "Legacy petition: no verified activity recorded yet."
            : data.verified === true
                ? "SHA-256 stored hash chain verified."
                : "WARNING: Audit verification failed. Do not trust this history until investigated.";

        const summary = node(
            "li",
            "audit-event",
            text
        );

        summary.style.fontWeight = "700";
        timeline.append(summary);

        if (!Array.isArray(data.events)) return;

        for (const event of data.events) {
            const item = node("li", "audit-event");

            const title = node(
                "strong",
                "",
                `${event.sequence}. ${eventLabels[event.type] || event.type}`
            );

            const details = node(
                "p",
                "",
                eventDescription(event)
            );

            const time = node(
                "small",
                "",
                `${ist(event.occurredAt)} · ${event.actorRole || "SYSTEM"}`
            );

            const hash = node(
                "small",
                "",
                `SHA-256: ${event.hash || "Unavailable"}`
            );

            hash.style.display = "block";
            hash.style.overflowWrap = "anywhere";

            item.append(
                title,
                details,
                time,
                hash
            );

            timeline.append(item);
        }
    }

    async function loadAudit(id) {
        const timeline = byId("audit-timeline");

        if (!timeline) return;

        const requestId = ++auditRequestId;

        timeline.replaceChildren(
            node(
                "li",
                "audit-event",
                "Checking audit history..."
            )
        );

        try {
            const result = await api(
                `/api/complaints/${encodeURIComponent(id)}/audit`
            );

            if (
                requestId !== auditRequestId ||
                id !== selectedId ||
                !dialog.open
            ) {
                return;
            }

            renderAudit(result);

        } catch (error) {
            if (
                requestId !== auditRequestId ||
                id !== selectedId ||
                !dialog.open
            ) {
                return;
            }

            timeline.replaceChildren(
                node(
                    "li",
                    "audit-event",
                    `Audit unavailable: ${error.message}`
                )
            );

            console.error(
                "Audit loading failed:",
                error
            );
        }
    }

    function openPetition(id) {
        selectedId = id;

        if (!selected()) return;

        setText("priority-feedback", "");
        setText("update-feedback", "");

        if (byId("decision-reason")) {
            byId("decision-reason").value = "";
        }

        if (!dialog.open) {
            dialog.showModal();
        }

        renderDetails();
        void loadAudit(id);

        dialog.scrollTop = 0;
    }

    function applyUpdate(updated) {
        if (!updated?._id) {
            throw new Error(
                "Unexpected petition response."
            );
        }

        const index = petitions.findIndex(
            p => p._id === updated._id
        );

        if (index < 0) {
            throw new Error(
                "Updated petition missing from queue."
            );
        }

        petitions[index] = updated;
        renderQueue();

        if (
            dialog.open &&
            selectedId === updated._id
        ) {
            renderDetails();
            void loadAudit(updated._id);
        }
    }

    async function loadPetitions() {
        if (queueBusy) return;

        queueBusy = true;

        setText(
            "queue-feedback",
            "Loading petitions..."
        );

        try {
            const result = await api("/api/complaints");

            if (!Array.isArray(result)) {
                throw new Error(
                    "Invalid petition list returned by server."
                );
            }

            petitions = result;
            renderQueue();

            if (dialog.open && selected()) {
                renderDetails();
                void loadAudit(selectedId);
            }

        } catch (error) {
            setText("queue-feedback", error.message);

            console.error(
                "Work Queue loading failed:",
                error
            );

        } finally {
            queueBusy = false;
        }
    }

    priorityForm?.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            const petition = selected();
            if (!petition) return;

            const priority = byId("priority-select")?.value;

            if (!["High", "Medium", "Low"].includes(priority)) {
                setText(
                    "priority-feedback",
                    "Choose a valid priority."
                );
                return;
            }

            const button = priorityButton();

            if (button) button.disabled = true;

            setText(
                "priority-feedback",
                "Saving priority..."
            );

            try {
                const updated = await api(
                    `/api/complaints/${petition._id}/priority`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ priority })
                    }
                );

                applyUpdate(updated);

                setText(
                    "priority-feedback",
                    `Priority saved. ${sla(updated)}.`
                );

            } catch (error) {
                setText(
                    "priority-feedback",
                    error.message
                );

                console.error(error);

            } finally {
                if (button) {
                    button.disabled = [
                        "RESOLVED",
                        "CLOSED"
                    ].includes(
                        statusOf(selected()?.status)
                    );
                }
            }
        }
    );

    statusForm?.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            const petition = selected();
            if (!petition) return;

            const status = byId("petition-action")?.value;

            const reason =
                byId("decision-reason")?.value.trim() || "";

            if (
                status !== transitions[
                    statusOf(petition.status)
                ]
            ) {
                setText(
                    "update-feedback",
                    "No valid status transition selected."
                );
                return;
            }

            if (!reason || reason.length > 2000) {
                setText(
                    "update-feedback",
                    "Enter a decision reason (1–2000 characters)."
                );
                return;
            }

            const button = statusButton();

            if (button) button.disabled = true;

            setText(
                "update-feedback",
                "Saving status..."
            );

            try {
                const updated = await api(
                    `/api/complaints/${petition._id}/status`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            status,
                            reason
                        })
                    }
                );

                applyUpdate(updated);

                if (byId("decision-reason")) {
                    byId("decision-reason").value = "";
                }

                setText(
                    "update-feedback",
                    "Status saved; audit history refreshed."
                );

            } catch (error) {
                setText(
                    "update-feedback",
                    error.message
                );

                console.error(error);

            } finally {
                if (button) {
                    button.disabled = !transitions[
                        statusOf(selected()?.status)
                    ];
                }
            }
        }
    );

    byId("close-petition")?.addEventListener(
        "click",
        () => dialog.close()
    );

    dialog.addEventListener("close", () => {
        auditRequestId++;

        if (lastFocused?.isConnected) {
            lastFocused.focus();
        }
    });

    byId("queue-filters")?.addEventListener(
        "submit",
        event => {
            event.preventDefault();
            renderQueue();
        }
    );

    for (const id of [
        "petition-search",
        "status-filter",
        "category-filter"
    ]) {
        byId(id)?.addEventListener(
            id === "petition-search"
                ? "input"
                : "change",
            renderQueue
        );
    }

    byId("refresh-queue")?.addEventListener(
        "click",
        loadPetitions
    );

    document.querySelectorAll(
        ".sign-out-button"
    ).forEach(button => {
        button.addEventListener("click", () => {
            sessionStorage.removeItem("authToken");

            location.replace("/login.html");
        });
    });

    setInterval(refreshCountdowns, 60000);

    void loadPetitions();
})();
