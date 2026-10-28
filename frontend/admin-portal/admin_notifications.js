"use strict";

/* =========================================
   SAMPLE NOTIFICATIONS

   petitionId must match an id in the petitions
   array inside admin_work_queue.js.

   Newest notifications are listed first.
========================================= */

const notifications = [
    {
        id: "N001",
        petitionId: "59D4EFC3",
        message: "SLA expired. Petition escalated to authority tier 1.",
        displayTime: "Oct 27, 2026, 11:48 PM",
        dateTime: "2026-10-27T23:48:00+05:30",
        read: false
    },
    {
        id: "N002",
        petitionId: "59D4EFC3",
        message: "SLA deadline is approaching.",
        displayTime: "Oct 27, 2026, 11:46 PM",
        dateTime: "2026-10-27T23:46:00+05:30",
        read: false
    },
    {
        id: "N003",
        petitionId: "59D4EF69",
        message: "SLA deadline is approaching.",
        displayTime: "Oct 27, 2026, 11:46 PM",
        dateTime: "2026-10-27T23:46:00+05:30",
        read: false
    },
    {
        id: "N004",
        petitionId: "59D4EF69",
        message: "Petition status: IN_REVIEW.",
        displayTime: "Oct 27, 2026, 11:43 PM",
        dateTime: "2026-10-27T23:43:00+05:30",
        read: false
    },
    {
        id: "N005",
        petitionId: "59D4EF69",
        message: "Petition status: ASSIGNED.",
        displayTime: "Oct 27, 2026, 11:42 PM",
        dateTime: "2026-10-27T23:42:00+05:30",
        read: false
    },
    {
        id: "N006",
        petitionId: "59D4EFB8",
        message: "A new petition has been filed.",
        displayTime: "Oct 27, 2026, 11:42 PM",
        dateTime: "2026-10-27T23:42:00+05:30",
        read: false
    }
];

/* =========================================
   ELEMENT REFERENCES
========================================= */

const notificationList = document.getElementById(
    "notification-list"
);

const markAllReadButton = document.getElementById(
    "mark-all-read"
);

const notificationFeedback = document.getElementById(
    "notification-feedback"
);

/* =========================================
   UPDATE UNREAD COUNT
========================================= */

function updateNotificationSummary() {
    const unreadCount = notifications.filter(function (notification) {
        return !notification.read;
    }).length;

    if (notifications.length === 0) {
        notificationFeedback.textContent = "No notifications yet.";
    } else if (unreadCount === 0) {
        notificationFeedback.textContent =
            "You’re all caught up. All notifications are read.";
    } else {
        notificationFeedback.textContent =
            unreadCount + " unread notification" +
            (unreadCount === 1 ? "." : "s.");
    }

    markAllReadButton.disabled = unreadCount === 0;

    markAllReadButton.textContent =
        unreadCount === 0 ? "All read" : "Mark all read";
}

/* =========================================
   DISPLAY NOTIFICATIONS

   createElement() comes from admin_work_queue.js.
========================================= */

function renderNotifications() {
    notificationList.replaceChildren();

    if (notifications.length === 0) {
        notificationList.append(
            createElement(
                "li",
                "notification-empty",
                "No notifications to show."
            )
        );

        updateNotificationSummary();
        return;
    }

    notifications.forEach(function (notification) {
        const petition = petitions.find(function (item) {
            return item.id === notification.petitionId;
        });

        const item = createElement(
            "li",
            "notification-item " +
            (notification.read ? "is-read" : "is-unread")
        );

        const content = createElement(
            "div",
            "notification-content"
        );

        const message = createElement(
            "p",
            "notification-message",
            notification.message
        );

        const petitionTitle = createElement(
            "p",
            "notification-petition",
            petition
                ? petition.title
                : "This petition is no longer available."
        );

        const timeRow = createElement("div");

        const time = createElement(
            "time",
            "notification-time",
            notification.displayTime
        );

        time.dateTime = notification.dateTime;

        const readState = createElement(
            "span",
            "notification-read-state",
            notification.read ? "Read" : "Unread"
        );

        time.append(readState);
        timeRow.append(time);

        content.append(message, petitionTitle, timeRow);

        const viewButton = createElement(
            "button",
            "view-notification",
            "View →"
        );

        viewButton.type = "button";
        viewButton.setAttribute("aria-haspopup", "dialog");

        if (petition) {
            viewButton.setAttribute(
                "aria-label",
                "View petition: " + petition.title
            );

            viewButton.addEventListener("click", function () {
                /*
                   Mark the notification as read without rebuilding
                   the list, so the View button stays available
                   for focus restoration when the dialog closes.
                */
                notification.read = true;

                item.classList.remove("is-unread");
                item.classList.add("is-read");

                readState.textContent = "Read";

                updateNotificationSummary();

                /*
                   Reuse the same petition dialog function
                   used by the Work queue.
                */
                openPetition(petition, viewButton);
            });
        } else {
            viewButton.disabled = true;
            viewButton.textContent = "Unavailable";
        }

        item.append(content, viewButton);
        notificationList.append(item);
    });

    updateNotificationSummary();
}

/* =========================================
   MARK ALL NOTIFICATIONS AS READ
========================================= */

markAllReadButton.addEventListener("click", function () {
    notifications.forEach(function (notification) {
        notification.read = true;
    });

    renderNotifications();
});

/* INITIAL DISPLAY */
renderNotifications();