const notifications = [
    {
        id: 1,
        title: "Petition submitted",
        message: "Your hostel maintenance petition has been submitted.",
        time: "Just now",
        read: false
    },
    {
        id: 2,
        title: "Status updated",
        message: "Your library hours petition is now under review.",
        time: "2 hours ago",
        read: false
    },
    {
        id: 3,
        title: "Petition resolved",
        message: "Your previous petition has been resolved.",
        time: "Yesterday",
        read: true
    }
];

const notificationList = document.querySelector("#notification-list");

function renderNotifications() {
    notificationList.innerHTML = "";

    notifications.forEach(function(notification) {
        const card = document.createElement("div");
        card.classList.add("notification");

        if (!notification.read) {
            card.classList.add("unread");
        }

        const title = document.createElement("h3");
        title.textContent = notification.title;

        const message = document.createElement("p");
        message.textContent = notification.message;

        const time = document.createElement("small");
        time.textContent = notification.time;

        const readButton = document.createElement("button");
        readButton.textContent = notification.read ? "Read" : "Mark as read";
        readButton.disabled = notification.read;

        readButton.addEventListener("click", function() {
        notification.read = true;
        renderNotifications();
});

card.append(title, message, time, readButton);
notificationList.append(card);
        updateUnreadCount();
    });
}

function updateUnreadCount() {
    const unreadCount = notifications.filter(function(notification) {
        return !notification.read;
    }).length;

    document.querySelector("#unread-count").textContent = unreadCount;
}

renderNotifications();

const markAllReadButton = document.querySelector("#mark-all-read");

markAllReadButton.addEventListener("click", function() {
    notifications.forEach(function(notification) {
        notification.read = true;
    });

    renderNotifications();
});