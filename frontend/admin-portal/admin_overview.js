
(() => {
    "use strict";

    const byId = id => document.getElementById(id);

    const tableBody = byId("overview-petitions");
    const refreshButton = byId("refresh-overview");
    const feedback = byId("overview-feedback");
    const filters = byId("overview-filters");

    const statusLabels = {
        FILED: "Filed",
        ASSIGNED: "Assigned",
        IN_REVIEW: "In Review",
        RESOLVED: "Resolved",
        CLOSED: "Closed"
    };

    let petitions = [];
    let loading = false;
    let hasLoaded = false;

    if (
        !tableBody ||
        !refreshButton ||
        !feedback ||
        !filters
    ) {
        console.error(
            "Admin Overview: required HTML elements are missing."
        );
        return;
    }

    const text = (id, value) => {
        const element = byId(id);

        if (element) {
            element.textContent = String(value);
        }
    };

    function create(tag, value, className = "") {
        const element = document.createElement(tag);

        element.textContent = String(value);

        if (className) {
            element.className = className;
        }

        return element;
    }

    function formatIST(value) {
        const date = new Date(value);

        if (
            !value ||
            Number.isNaN(date.getTime())
        ) {
            return "Date unavailable";
        }

        return new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date) + " IST";
    }

    function active(petition) {
        return [
            "FILED",
            "ASSIGNED",
            "IN_REVIEW"
        ].includes(petition.status);
    }

    function overdue(petition) {
        if (
            !active(petition) ||
            !petition.slaDeadline
        ) {
            return false;
        }

        const deadline = new Date(
            petition.slaDeadline
        ).getTime();

        return (
            Number.isFinite(deadline) &&
            deadline <= Date.now()
        );
    }

    function slaLabel(petition) {
        if (!active(petition)) {
            return "Completed";
        }

        if (!petition.slaDeadline) {
            return "No deadline";
        }

        const difference =
            new Date(petition.slaDeadline).getTime() -
            Date.now();

        if (!Number.isFinite(difference)) {
            return "Invalid deadline";
        }

        const absoluteMinutes = Math.ceil(
            Math.abs(difference) / 60000
        );

        const days = Math.floor(
            absoluteMinutes / 1440
        );

        const hours = Math.floor(
            (absoluteMinutes % 1440) / 60
        );

        const minutes = absoluteMinutes % 60;

        const period = [
            days ? `${days}d` : "",
            hours ? `${hours}h` : "",
            minutes || (!days && !hours)
                ? `${minutes}m`
                : ""
        ].filter(Boolean).join(" ");

        return difference <= 0
            ? `Overdue by ${period}`
            : `${period} left`;
    }

    async function api(path) {
        const token = sessionStorage.getItem(
            "authToken"
        );

        if (!token) {
            window.location.replace("/login.html");

            throw new Error(
                "Please sign in as an administrator."
            );
        }

        const response = await fetch(path, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            sessionStorage.removeItem("authToken");

            window.location.replace("/login.html");

            throw new Error(
                "Session expired. Please sign in again."
            );
        }

        if (response.status === 403) {
            throw new Error(
                "Administrator access is required for this page."
            );
        }

        const data = await response.json()
            .catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message ||
                `Request failed (${response.status}).`
            );
        }

        return data;
    }

    function renderTable() {
        tableBody.replaceChildren();

        if (!hasLoaded) {
            return;
        }

        const search = byId("petition-search")
            .value.trim().toLowerCase();

        const status = byId("status-filter").value;
        const category = byId("category-filter").value;

        const filtered = petitions.filter(petition =>
            String(petition.title || "")
                .toLowerCase()
                .includes(search) &&

            (
                status === "all" ||
                petition.status === status
            ) &&

            (
                category === "all" ||
                petition.category === category
            )
        );

        for (const petition of filtered) {
            const row = document.createElement("tr");

            const titleCell = document.createElement("td");

            titleCell.append(
                create(
                    "strong",
                    petition.title || "Untitled petition"
                ),

                create(
                    "small",
                    `#${String(petition._id).slice(-8)} · ${formatIST(petition.createdAt)}`,
                    "overview-muted"
                )
            );

            const statusCell = create(
                "td",
                statusLabels[petition.status] ||
                petition.status ||
                "Unknown"
            );

            const priorityCell = create(
                "td",
                petition.priority || "Medium"
            );

            const slaCell = create(
                "td",
                slaLabel(petition)
            );

            if (overdue(petition)) {
                slaCell.classList.add(
                    "overview-overdue"
                );
            }

            const actionCell =
                document.createElement("td");

            const link = create(
                "a",
                "Work Queue →",
                "overview-manage-link"
            );

            link.href = "admin_work_queue.html";

            link.setAttribute(
                "aria-label",
                `Manage ${petition.title || "petition"} in Work Queue`
            );

            actionCell.append(link);

            row.append(
                titleCell,
                statusCell,
                priorityCell,
                slaCell,
                actionCell
            );

            tableBody.append(row);
        }

        if (filtered.length === 0) {
            const row = document.createElement("tr");

            const cell = create(
                "td",
                "No petitions match your filters.",
                "overview-empty"
            );

            cell.colSpan = 5;
            row.append(cell);
            tableBody.append(row);
        }

        feedback.textContent =
            `Showing ${filtered.length} of ${petitions.length} petition(s).`;
    }

    function refreshOverdueCount() {
        if (!hasLoaded) {
            return;
        }

        text(
            "overview-overdue-count",
            petitions.filter(overdue).length
        );
    }

    async function loadOverview() {
        if (loading) {
            return;
        }

        loading = true;
        refreshButton.disabled = true;

        feedback.textContent =
            "Loading institution-wide statistics and petitions...";

        try {
            const [stats, records] = await Promise.all([
                api("/api/complaints/stats"),
                api("/api/complaints")
            ]);

            if (
                !Array.isArray(records) ||
                ![
                    stats.total,
                    stats.pending,
                    stats.inReview,
                    stats.resolved
                ].every(
                    number =>
                        Number.isInteger(number) &&
                        number >= 0
                )
            ) {
                throw new Error(
                    "Unexpected statistics or petition data returned by server."
                );
            }

            petitions = records;
            hasLoaded = true;

            text(
                "overview-total-count",
                stats.total
            );

            text(
                "overview-active-count",
                stats.pending + stats.inReview
            );

            text(
                "overview-resolved-count",
                stats.resolved
            );

            refreshOverdueCount();
            renderTable();

        } catch (error) {
            console.error(
                "Admin Overview failed:",
                error
            );

            feedback.textContent = error.message;

            if (!hasLoaded) {
                for (const id of [
                    "overview-total-count",
                    "overview-active-count",
                    "overview-resolved-count",
                    "overview-overdue-count"
                ]) {
                    text(id, "—");
                }

                tableBody.replaceChildren();
            }

        } finally {
            loading = false;
            refreshButton.disabled = false;
        }
    }

    filters.addEventListener("submit", event => {
        event.preventDefault();
        renderTable();
    });

    for (const id of [
        "petition-search",
        "status-filter",
        "category-filter"
    ]) {
        byId(id)?.addEventListener(
            id === "petition-search"
                ? "input"
                : "change",
            renderTable
        );
    }

    refreshButton.addEventListener(
        "click",
        loadOverview
    );

    byId("admin-logout")?.addEventListener(
        "click",
        () => {
            sessionStorage.removeItem("authToken");

            window.location.replace(
                "/login.html"
            );
        }
    );

    setInterval(() => {
        if (hasLoaded && !loading) {
            refreshOverdueCount();
            renderTable();
        }
    }, 60000);

    void loadOverview();
})();
