
import mongoose from "mongoose";

const auditEventSchema = new mongoose.Schema({
    complaint: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Complaint",
        required: true
    },

    sequence: {
        type: Number,
        required: true,
        min: 1
    },

    type: {
        type: String,
        enum: [
            "CREATED",
            "BASELINE",
            "PRIORITY_CHANGED",
            "STATUS_CHANGED",
            "SLA_OVERDUE"
        ],
        required: true
    },

    actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

    actorRole: {
        type: String,
        enum: ["STUDENT", "ADMIN", "SYSTEM"],
        required: true
    },

    occurredAt: {
        type: Date,
        required: true
    },

    details: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },

    previousHash: {
        type: String,
        required: true
    },

    hash: {
        type: String,
        required: true
    }

}, { versionKey: false });

auditEventSchema.index(
    {
        complaint: 1,
        sequence: 1
    },
    {
        unique: true
    }
);

const AuditEvent =
    mongoose.models.AuditEvent ||
    mongoose.model("AuditEvent", auditEventSchema);

export default AuditEvent;
