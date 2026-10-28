
import mongoose from "mongoose";

import Complaint from "../models/complaint.js";
import Notification from "../models/notification.js";

import {
    recordOverdueIfNeeded
} from "./audit.js";

async function ensureNotification(
    recipient,
    complaint,
    type,
    message
) {
    await Notification.updateOne(
        {
            recipient,
            complaint,
            type
        },
        {
            $setOnInsert: {
                message,
                read: false
            }
        },
        {
            upsert: true
        }
    );
}

export async function notifyAdmins(
    complaint,
    type
) {
    if (![
        "NEW_PETITION",
        "SLA_OVERDUE"
    ].includes(type)) {
        throw new Error(
            "Invalid notification type"
        );
    }

    const admins = await mongoose.model("User")
        .find({ role: "ADMIN" })
        .select("_id")
        .lean();

    const message =
        type === "NEW_PETITION"
            ? `New petition filed: ${complaint.title}`
            : `SLA overdue: ${complaint.title}`;

    await Promise.all(
        admins.map(admin =>
            ensureNotification(
                admin._id,
                complaint._id,
                type,
                message
            )
        )
    );
}

export async function notifyStudentResolved(
    complaint
) {
    await ensureNotification(
        complaint.student,
        complaint._id,
        "RESOLVED",
        `Your petition has been resolved: ${complaint.title}`
    );
}

export function startOverdueChecker() {
    let running = false;

    async function checkOverdue() {
        if (running) return;

        running = true;

        try {
            const overdue = await Complaint.find({
                status: {
                    $in: [
                        "FILED",
                        "ASSIGNED",
                        "IN_REVIEW"
                    ]
                },

                slaDeadline: {
                    $lte: new Date()
                }
            })
                .select("_id title")
                .lean();

            for (const complaint of overdue) {
                try {
                    await recordOverdueIfNeeded(
                        complaint._id
                    );

                    await notifyAdmins(
                        complaint,
                        "SLA_OVERDUE"
                    );

                } catch (error) {
                    console.error(
                        "Overdue processing failed:",
                        complaint._id,
                        error
                    );
                }
            }

        } catch (error) {
            console.error(
                "SLA check failed:",
                error
            );

        } finally {
            running = false;
        }
    }

    void checkOverdue();

    setInterval(
        checkOverdue,
        60 * 1000
    );
}
