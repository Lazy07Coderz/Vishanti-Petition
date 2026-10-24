
import { Router } from "express";
import mongoose from "mongoose";
import { rm } from "node:fs/promises";
import Complaint from "../models/Complaint.js";
import { uploadEvidence } from "../middleware/upload.js";

const router = Router();

router.get("/", async (req, res) => {
    try {
        const complaints = await Complaint.find();
        res.status(200).json(complaints);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch complaints"
        });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid complaint ID"
            });
        }

        const complaint = await Complaint.findById(id);

        if (!complaint) {
            return res.status(404).json({
                message: "Complaint not found"
            });
        }

        res.status(200).json(complaint);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch complaint"
        });
    }
});

router.post("/", uploadEvidence, async (req, res) => {
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
            evidence: req.file?.filename ?? null
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

export default router;
