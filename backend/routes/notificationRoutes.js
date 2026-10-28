
import { Router } from "express";
import mongoose from "mongoose";

import authenticate from "../middleware/authenticate.js";
import Notification from "../models/notification.js";

const router = Router();

router.use(authenticate);

router.get("/", async (req, res) => {
    try {
        const notifications = await Notification.find({
            recipient: req.user.id
        })
            .select(
                "complaint type message read createdAt"
            )
            .sort({
                createdAt: -1
            })
            .limit(100)
            .lean();

        res.status(200).json(notifications);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Unable to load notifications"
        });
    }
});

router.get("/unread-count", async (req, res) => {
    try {
        const unread = await Notification.countDocuments({
            recipient: req.user.id,
            read: false
        });

        res.status(200).json({
            unread
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Unable to count notifications"
        });
    }
});

router.patch("/read-all", async (req, res) => {
    try {
        const result = await Notification.updateMany(
            {
                recipient: req.user.id,
                read: false
            },
            {
                $set: {
                    read: true
                }
            }
        );

        res.status(200).json({
            markedRead: result.modifiedCount
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Unable to mark notifications as read"
        });
    }
});

router.patch("/:id/read", async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
            message: "Invalid notification ID"
        });
    }

    try {
        const notification =
            await Notification.findOneAndUpdate(
                {
                    _id: req.params.id,
                    recipient: req.user.id
                },
                {
                    $set: {
                        read: true
                    }
                },
                {
                    new: true
                }
            ).select(
                "complaint type message read createdAt"
            );

        if (!notification) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        res.status(200).json(notification);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Unable to update notification"
        });
    }
});

export default router;
