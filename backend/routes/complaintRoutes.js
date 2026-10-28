
import { Router } from "express";
import mongoose from "mongoose";
import { rm } from "node:fs/promises";
import Complaint from "../models/Complaint.js";
import { uploadEvidence } from "../middleware/upload.js";
import authenticate from "../middleware/authenticate.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();


router.get("/", authenticate, requireAdmin, async (req, res) => {
    try {
        const complaints = await Complaint.find()
            .select("-student")
            .sort({ createdAt: -1 });

        res.status(200).json(complaints);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch complaints"
        });
    }
});



router.get("/mine", authenticate, async (req, res) => {
    try {
        if (req.user.role !== "STUDENT") {
            return res.status(403).json({
                message: "Student access required"
            });
        }

        const complaints = await Complaint.find({
            student: req.user.id
        }).sort({ createdAt: -1 });

        res.status(200).json(complaints);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch your petitions"
        });
    }
});



router.get("/:id", authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid petition ID"
            });
        }

        const complaint = await Complaint.findOne({
            _id: id,
            student: req.user.id
        });

        if (!complaint) {
            return res.status(404).json({
                message: "Petition not found"
            });
        }

        res.status(200).json(complaint);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to retrieve petition"
        });
    }
});


router.post("/", authenticate, uploadEvidence, async (req, res) => {
    try {
        const { title, category, description } = req.body;

        const anonymous =
            req.body.anonymous === true ||
            req.body.anonymous === "true";

        const complaint = await Complaint.create({
            title,
            category,
            anonymous,
            description,
            evidence: req.file?.filename ?? null,
            student: req.user.id
        });

        res.status(201).json(complaint);

    } catch (error) {
        if (req.file) {
            try {
                await rm(req.file.path, { force: true });
            } catch (cleanupError) {
                console.error(cleanupError);
            }
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: error.message
            });
        }

        res.status(500).json({
            message: "Failed to submit petition"
        });
    }
});


const nextStatus = {
    FILED: "ASSIGNED",
    ASSIGNED: "IN_REVIEW",
    IN_REVIEW: "RESOLVED",
    RESOLVED: "CLOSED"
};

router.patch("/:id/status", authenticate, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body ?? {};

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
            message: "Invalid petition ID"
        });
    }

    try {
        const complaint = await Complaint.findById(id);

        if (!complaint) {
            return res.status(404).json({
                message: "Petition not found"
            });
        }

        if (nextStatus[complaint.status] !== status) {
            return res.status(409).json({
                message: "Invalid status transition"
            });
        }

        const updates = { status };

        if (status === "ASSIGNED") {
            updates.assignedTo = req.user.id;
        }

        const updatedComplaint = await Complaint.findOneAndUpdate(
            {
                _id: id,
                status: complaint.status
            },
            {
                $set: updates
            },
            {
                new: true,
                runValidators: true
            }
        ).select("-student");

        if (!updatedComplaint) {
            return res.status(409).json({
                message: "Petition status changed. Please refresh."
            });
        }

        res.status(200).json(updatedComplaint);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update petition status"
        });
    }
});


export default router;
