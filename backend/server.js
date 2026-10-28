
import express from "express";
import mongoose from "mongoose";
import { fileURLToPath } from "node:url";

import authRoutes from "./routes/authRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

import Notification from "./models/notification.js";

import {
    startOverdueChecker
} from "./services/notifications.js";

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/api/auth", authRoutes);

app.use("/api/complaints", complaintRoutes);

app.use("/api/notifications", notificationRoutes);

const studentPages = fileURLToPath(
    new URL("../frontend/student-portal/", import.meta.url)
);

const frontendRoot = fileURLToPath(
    new URL("../frontend/", import.meta.url)
);

app.use(express.static(studentPages));

app.use(express.static(frontendRoot));

app.get("/", (req, res) => {
    res.redirect("/login.html");
});

async function startServer() {
    try {
        await mongoose.connect(
            process.env.MONGODB_URI,
            {
                dbName: "Vishanti"
            }
        );

        await Notification.init();

        console.log(
            "MongoDB connected successfully"
        );

        app.listen(PORT, () => {
            console.log(
                `Server running on http://localhost:${PORT}`
            );

            startOverdueChecker();
        });

    } catch (error) {
        console.error(
            "Server startup failed:",
            error
        );

        process.exit(1);
    }
}

startServer();
