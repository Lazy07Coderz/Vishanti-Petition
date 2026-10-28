
import { Router } from "express";
import mongoose from "mongoose";
import { rm } from "node:fs/promises";

import Complaint from "../models/complaint.js";
import { uploadEvidence } from "../middleware/upload.js";
import authenticate from "../middleware/authenticate.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { calculateSlaDeadline } from "../utils/sla.js";

import {
    notifyAdmins,
    notifyStudentResolved
} from "../services/notifications.js";

import {
    appendAudit,
    baselineIfNeeded,
    auditHistory
} from "../services/audit.js";

const router = Router();

const nextStatus = {
    FILED: "ASSIGNED",
    ASSIGNED: "IN_REVIEW",
    IN_REVIEW: "RESOLVED",
    RESOLVED: "CLOSED"
};

const priorities = [
    "High",
    "Medium",
    "Low"
];

const categories = [
    "Academics",
    "Hostel & Facilities",
    "Library",
    "Other"
];

const requireStudent = (req, res, next) =>
    req.user?.role === "STUDENT"
        ? next()
        : res.status(403).json({
            message: "Student access required"
        });

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function respondError(res, error, fallback) {
    console.error(error);

    res.status(
        error.status ||
        (error.name === "ValidationError" ? 400 : 500)
    ).json({
        message:
            error.status ||
            error.name === "ValidationError"
                ? error.message
                : fallback
    });
}

async function removeUpload(req) {
    if (req.file) {
        try {
            await rm(req.file.path, {
                force: true
            });
        } catch (error) {
            console.error(
                "Upload cleanup failed:",
                error
            );
        }
    }
}

async function inTransaction(callback) {
    const session = await mongoose.startSession();

    try {
        let result;

        await session.withTransaction(async () => {
            result = await callback(session);
        });

        return result;

    } finally {
        await session.endSession();
    }
}

async function ownedComplaint(req) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        throw new HttpError(
            400,
            "Invalid petition ID"
        );
    }

    if (req.user.role === "ADMIN") {
        return Complaint.findById(req.params.id);
    }

    if (req.user.role === "STUDENT") {
        return Complaint.findOne({
            _id: req.params.id,
            student: req.user.id
        });
    }

    throw new HttpError(403, "Access denied");
}

router.get(
    "/stats",
    authenticate,
    async (req, res) => {
        try {
            const [
                total,
                pending,
                inReview,
                resolved
            ] = await Promise.all([
                Complaint.countDocuments(),

                Complaint.countDocuments({
                    status: {
                        $in: ["FILED", "ASSIGNED"]
                    }
                }),

                Complaint.countDocuments({
                    status: "IN_REVIEW"
                }),

                Complaint.countDocuments({
                    status: {
                        $in: ["RESOLVED", "CLOSED"]
                    }
                })
            ]);

            res.json({
                total,
                pending,
                inReview,
                resolved
            });

        } catch (error) {
            respondError(
                res,
                error,
                "Failed to load petition statistics"
            );
        }
    }
);

router.get(
    "/mine",
    authenticate,
    requireStudent,
    async (req, res) => {
        try {
            const petitions = await Complaint.find({
                student: req.user.id
            }).sort({
                createdAt: -1
            });

            res.json(petitions);

        } catch (error) {
            respondError(
                res,
                error,
                "Failed to load your petitions"
            );
        }
    }
);

router.get(
    "/",
    authenticate,
    requireAdmin,
    async (req, res) => {
        try {
            const petitions = await Complaint.find()
                .select("-student")
                .sort({ createdAt: -1 });

            res.json(petitions);

        } catch (error) {
            respondError(
                res,
                error,
                "Failed to load petitions"
            );
        }
    }
);

router.get(
    "/:id/audit/verify",
    authenticate,
    async (req, res) => {
        try {
            const complaint = await ownedComplaint(req);

            if (!complaint) {
                throw new HttpError(
                    404,
                    "Petition not found"
                );
            }

            const result = await auditHistory(complaint);

            res.json({
                verified: result.verified,
                legacyUntracked: result.legacyUntracked,
                message: result.message,
                eventCount: result.events.length
            });

        } catch (error) {
            respondError(
                res,
                error,
                "Failed to verify audit trail"
            );
        }
    }
);

router.get(
    "/:id/audit",
    authenticate,
    async (req, res) => {
        try {
            const complaint = await ownedComplaint(req);

            if (!complaint) {
                throw new HttpError(
                    404,
                    "Petition not found"
                );
            }

            res.json(await auditHistory(complaint));

        } catch (error) {
            respondError(
                res,
                error,
                "Failed to load audit trail"
            );
        }
    }
);

router.get(
    "/:id",
    authenticate,
    async (req, res) => {
        try {
            const complaint = await ownedComplaint(req);

            if (!complaint) {
                throw new HttpError(
                    404,
                    "Petition not found"
                );
            }

            const data = complaint.toObject();

            if (req.user.role === "ADMIN") {
                delete data.student;
            }

            res.json(data);

        } catch (error) {
            respondError(
                res,
                error,
                "Failed to retrieve petition"
            );
        }
    }
);

router.post(
    "/",
    authenticate,
    requireStudent,
    uploadEvidence,
    async (req, res) => {
        const title =
            typeof req.body?.title === "string"
                ? req.body.title.trim()
                : "";

        const category = req.body?.category;

        const description =
            typeof req.body?.description === "string"
                ? req.body.description.trim()
                : "";

        if (
            !title ||
            title.length > 200 ||
            !categories.includes(category) ||
            !description ||
            description.length > 5000
        ) {
            await removeUpload(req);

            return res.status(400).json({
                message:
                    "Check the title, category and description"
            });
        }

        const anonymous = [
            "true",
            "yes"
        ].includes(
            String(req.body?.anonymous)
                .trim()
                .toLowerCase()
        );

        try {
            const petition = await inTransaction(
                async session => {
                    const createdAt = new Date();

                    const item = new Complaint({
                        title,
                        category,
                        description,
                        anonymous,

                        evidence:
                            req.file?.filename || null,

                        student: req.user.id,
                        status: "FILED",
                        priority: "Medium",
                        createdAt,

                        slaDeadline:
                            calculateSlaDeadline(
                                createdAt,
                                "Medium"
                            )
                    });

                    await item.save({ session });

                    await appendAudit(
                        item,
                        session,
                        "CREATED",
                        req.user.id,
                        "STUDENT",
                        {
                            status: item.status,
                            priority: item.priority,
                            category: item.category,

                            slaDeadline:
                                item.slaDeadline.toISOString(),

                            evidenceAttached:
                                Boolean(item.evidence)
                        }
                    );

                    await item.save({ session });

                    return item;
                }
            );

            try {
                await notifyAdmins(
                    petition,
                    "NEW_PETITION"
                );

            } catch (error) {
                console.error(
                    "New petition notification failed:",
                    error
                );
            }

            res.status(201).json(petition);

        } catch (error) {
            await removeUpload(req);

            respondError(
                res,
                error,
                "Failed to submit petition"
            );
        }
    }
);

router.patch(
    "/:id/priority",
    authenticate,
    requireAdmin,
    async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid petition ID"
            });
        }

        const { priority } = req.body || {};

        if (!priorities.includes(priority)) {
            return res.status(400).json({
                message: "Invalid priority"
            });
        }

        try {
            const updated = await inTransaction(
                async session => {
                    const complaint =
                        await Complaint.findById(
                            req.params.id
                        ).session(session);

                    if (!complaint) {
                        throw new HttpError(
                            404,
                            "Petition not found"
                        );
                    }

                    if ([
                        "RESOLVED",
                        "CLOSED"
                    ].includes(complaint.status)) {
                        throw new HttpError(
                            409,
                            "Cannot change priority of a completed petition"
                        );
                    }

                    if (complaint.priority === priority) {
                        return complaint;
                    }

                    await baselineIfNeeded(
                        complaint,
                        session
                    );

                    const previousPriority =
                        complaint.priority;

                    const previousDeadline =
                        complaint.slaDeadline?.toISOString()
                        || null;

                    complaint.priority = priority;

                    complaint.slaDeadline =
                        calculateSlaDeadline(
                            complaint.createdAt,
                            priority
                        );

                    await appendAudit(
                        complaint,
                        session,
                        "PRIORITY_CHANGED",
                        req.user.id,
                        "ADMIN",
                        {
                            previousPriority,
                            priority,
                            previousDeadline,

                            slaDeadline:
                                complaint.slaDeadline.toISOString()
                        }
                    );

                    await complaint.save({
                        session
                    });

                    return complaint;
                }
            );

            const data = updated.toObject();
            delete data.student;

            res.json(data);

        } catch (error) {
            respondError(
                res,
                error,
                "Failed to update priority"
            );
        }
    }
);

router.patch(
    "/:id/status",
    authenticate,
    requireAdmin,
    async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid petition ID"
            });
        }

        const { status, reason } = req.body || {};

        if (!Object.values(nextStatus).includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        if (
            typeof reason !== "string" ||
            !reason.trim() ||
            reason.trim().length > 2000
        ) {
            return res.status(400).json({
                message:
                    "Please enter a decision reason (1–2000 characters)"
            });
        }

        try {
            const updated = await inTransaction(
                async session => {
                    const complaint =
                        await Complaint.findById(
                            req.params.id
                        ).session(session);

                    if (!complaint) {
                        throw new HttpError(
                            404,
                            "Petition not found"
                        );
                    }

                    if (
                        nextStatus[complaint.status] !== status
                    ) {
                        throw new HttpError(
                            409,
                            "Invalid status transition"
                        );
                    }

                    await baselineIfNeeded(
                        complaint,
                        session
                    );

                    const previousStatus =
                        complaint.status;

                    complaint.status = status;

                    complaint.lastDecisionReason =
                        reason.trim();

                    if (status === "ASSIGNED") {
                        complaint.assignedTo =
                            req.user.id;
                    }

                    await appendAudit(
                        complaint,
                        session,
                        "STATUS_CHANGED",
                        req.user.id,
                        "ADMIN",
                        {
                            previousStatus,
                            status,
                            reason: reason.trim()
                        }
                    );

                    await complaint.save({
                        session
                    });

                    return complaint;
                }
            );

            if (status === "RESOLVED") {
                try {
                    await notifyStudentResolved(
                        updated
                    );

                } catch (error) {
                    console.error(
                        "Resolved notification failed:",
                        error
                    );
                }
            }

            const data = updated.toObject();
            delete data.student;

            res.json(data);

        } catch (error) {
            respondError(
                res,
                error,
                "Failed to change status"
            );
        }
    }
);

export default router;
