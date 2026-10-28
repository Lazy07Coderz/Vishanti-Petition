
(() => {
    "use strict";

    const byId = id => document.getElementById(id);

    const list = byId("notification-list");
    const feedback = byId("notification-feedback");
    const markAllButton = byId("mark-all-read");
    const refreshButton = byId("refresh-notifications");
    const unreadCountElement = byId("unread-count");
    const dialog = byId("petition-dialog");

    const isStudent =
        document.body.dataset.view === "student";

    if (!list || !feedback || !markAllButton || !refreshButton) {
        console.error(
            "Notification page is missing a required element."
        );
        return;
    }

    const titles = {
        NEW_PETITION: "New petition",
        RESOLVED: "Petition resolved",
        SLA_OVERDUE: "SLA overdue"
    };

    let notifications = [];
    let unreadCount = 0;
    let busy = false;
    let lastViewButton = null;

    function make(tag, className = "", text = "") {
        const node = document.createElement(tag);

        if (className) {
            node.className = className;
        }

        node.textContent = text;
        return node;
    }

    function showFeedback(message) {
        feedback.textContent = message;
    }

    function formatIST(value) {
        if (!value) return "Date unavailable";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return new Intl.DateTimeFormat("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Kolkata"
        }).format(date) + " IST";
    }

    function remainingTime(petition) {
        if (
            ["RESOLVED", "CLOSED"].includes(petition.status)
        ) {
            return "Completed";
        }

        if (!petition.slaDeadline) {
            return "Deadline unavailable";
        }

        const ms =
            new Date(petition.slaDeadline).getTime() -
            Date.now();

        if (!Number.isFinite(ms)) {
            return "Deadline unavailable";
        }

        const minutes = Math.ceil(
            Math.abs(ms) / 60000
        );

        const days = Math.floor(minutes / 1440);
        const hours = Math.floor((minutes % 1440) / 60);
        const mins = minutes % 60;

        const duration = [
            days && `${days}d`,
            hours && `${hours}h`,
            `${mins}m`
        ].filter(Boolean).join(" ");

        return ms <= 0
            ? `Overdue by ${duration}`
            : `${duration} remaining`;
    }

    async function api(url, options = {}) {
        const token =
            sessionStorage.getItem("authToken");

        if (!token) {
            window.location.replace("/login.html");

            throw new Error(
                "Please sign in."
            );
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(options.headers || {})
            }
        });

        if (response.status === 401) {
            sessionStorage.removeItem("authToken");

            window.location.replace("/login.html");

            throw new Error(
                "Session expired. Please sign in again."
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

    function render() {
        list.replaceChildren();

        if (unreadCountElement) {
            unreadCountElement.textContent =
                String(unreadCount);
        }

        markAllButton.disabled =
            busy || unreadCount === 0;

        markAllButton.textContent =
            unreadCount ? "Mark all read" : "All read";

        refreshButton.disabled = busy;

        if (notifications.length === 0) {
            list.append(
                make(
                    "li",
                    "notification-empty",
                    "No notifications yet."
                )
            );
            return;
        }

        for (const notification of notifications) {
            const item = make(
                "li",
                `notification-item ${
                    notification.read
                        ? "is-read"
                        : "is-unread"
                }`
            );

            const content = make(
                "div",
                "notification-content"
            );

            const heading = make(
                "p",
                "notification-petition",
                titles[notification.type] ||
                "Notification"
            );

            const message = make(
                "p",
                "notification-message",
                notification.message ||
                "Petition update"
            );

            const timestamp = make(
                "time",
                "notification-time",
                formatIST(notification.createdAt)
            );

            if (notification.createdAt) {
                timestamp.dateTime =
                    notification.createdAt;
            }

            timestamp.append(
                make(
                    "span",
                    "notification-read-state",
                    notification.read
                        ? "Read"
                        : "Unread"
                )
            );

            content.append(
                heading,
                message,
                timestamp
            );

            const actions = make(
                "div",
                "notification-actions-inline"
            );

            const viewButton = make(
                "button",
                "view-notification",
                "View →"
            );

            viewButton.type = "button";

            viewButton.disabled =
                busy || !notification.complaint;

            viewButton.addEventListener(
                "click",
                async () => {
                    lastViewButton = viewButton;

                    if (!notification.complaint) {
                        return;
                    }

                    await markOneRead(notification);

                    if (isStudent) {
                        window.location.assign(
                            `/petition-details.html?id=${encodeURIComponent(notification.complaint)}`
                        );
                    } else {
                        await showAdminPetition(
                            notification.complaint
                        );
                    }
                }
            );

            actions.append(viewButton);

            if (!notification.read) {
                const readButton = make(
                    "button",
                    "view-notification",
                    "Mark read"
                );

                readButton.type = "button";
                readButton.disabled = busy;

                readButton.addEventListener(
                    "click",
                    () => markOneRead(notification)
                );

                actions.append(readButton);
            }

            item.append(
                content,
                actions
            );

            list.append(item);
        }
    }

    async function loadNotifications() {
        if (busy) return;

        busy = true;

        showFeedback("Loading notifications...");
        render();

        try {
            const [items, count] = await Promise.all([
                api("/api/notifications"),
                api("/api/notifications/unread-count")
            ]);

            if (
                !Array.isArray(items) ||
                !Number.isInteger(count.unread)
            ) {
                throw new Error(
                    "Unexpected notification API response."
                );
            }

            notifications = items;
            unreadCount = count.unread;

            showFeedback(
                unreadCount === 0
                    ? "You're all caught up."
                    : `${unreadCount} unread notification${
                        unreadCount === 1 ? "" : "s"
                    }.`
            );

        } catch (error) {
            showFeedback(error.message);

            console.error(
                "Notification loading failed:",
                error
            );

        } finally {
            busy = false;
            render();
        }
    }

    async function markOneRead(notification) {
        if (notification.read || busy) return;

        busy = true;
        render();

        try {
            await api(
                `/api/notifications/${encodeURIComponent(notification._id)}/read`,
                {
                    method: "PATCH"
                }
            );

            notification.read = true;

            unreadCount = Math.max(
                0,
                unreadCount - 1
            );

            showFeedback(
                "Notification marked as read."
            );

        } catch (error) {
            console.error(
                "Mark read failed:",
                error
            );

            showFeedback(
                `Could not mark notification as read: ${error.message}`
            );

        } finally {
            busy = false;
            render();
        }
    }

    async function markAllRead() {
        if (busy || unreadCount === 0) return;

        busy = true;
        render();

        try {
            await api(
                "/api/notifications/read-all",
                {
                    method: "PATCH"
                }
            );

            notifications.forEach(item => {
                item.read = true;
            });

            unreadCount = 0;

            showFeedback(
                "All notifications marked as read."
            );

        } catch (error) {
            showFeedback(
                `Could not mark all as read: ${error.message}`
            );

            console.error(error);

        } finally {
            busy = false;
            render();
        }
    }

    async function showAdminPetition(id) {
        if (!dialog) return;

        const idElement = byId("petition-id");
        const titleElement = byId("petition-title");
        const meta = byId("petition-meta");
        const description = byId("petition-description");
        const dates = byId("petition-dates");
        const notice = byId("petition-view-feedback");

        if (idElement) {
            idElement.textContent =
                `PETITION #${String(id).slice(-8)}`;
        }

        if (titleElement) {
            titleElement.textContent =
                "Loading petition...";
        }

        if (description) {
            description.textContent = "";
        }

        if (dates) {
            dates.textContent = "";
        }

        if (meta) {
            meta.replaceChildren();
        }

        if (notice) {
            notice.textContent = "";
        }

        if (!dialog.open) {
            dialog.showModal();
        }

        try {
            const petition = await api(
                `/api/complaints/${encodeURIComponent(id)}`
            );

            if (titleElement) {
                titleElement.textContent =
                    petition.title || "Untitled petition";
            }

            if (description) {
                description.textContent =
                    petition.description || "No description";
            }

            if (dates) {
                dates.textContent =
                    `Filed: ${formatIST(petition.createdAt)} · Deadline: ${formatIST(petition.slaDeadline)} · ${remainingTime(petition)}`;
            }

            if (meta) {
                meta.replaceChildren(
                    make(
                        "span",
                        "",
                        `Status: ${String(petition.status || "Unknown").replaceAll("_", " ")}`
                    ),
                    make(
                        "span",
                        "",
                        `Priority: ${petition.priority || "Medium"}`
                    ),
                    make(
                        "span",
                        "",
                        petition.category || "Other"
                    )
                );
            }

            if (notice) {
                notice.textContent =
                    petition.lastDecisionReason
                        ? `Latest decision: ${petition.lastDecisionReason}`
                        : "Open Work Queue to manage this petition.";
            }

        } catch (error) {
            if (titleElement) {
                titleElement.textContent =
                    "Petition unavailable";
            }

            if (notice) {
                notice.textContent = error.message;
            }

            console.error(
                "Could not open petition:",
                error
            );
        }
    }

    markAllButton.addEventListener(
        "click",
        markAllRead
    );

    refreshButton.addEventListener(
        "click",
        loadNotifications
    );

    byId("close-petition")?.addEventListener(
        "click",
        () => dialog?.close()
    );

    dialog?.addEventListener(
        "close",
        () => {
            if (lastViewButton?.isConnected) {
                lastViewButton.focus();
            }
        }
    );

    byId("sign-out")?.addEventListener(
        "click",
        () => {
            sessionStorage.removeItem("authToken");

            window.location.replace(
                "/login.html"
            );
        }
    );

    void loadNotifications();
})();
