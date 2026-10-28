
import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },

    category: {
        type: String,
        enum: [
            "Academics",
            "Hostel & Facilities",
            "Library",
            "Other"
        ],
        required: true
    },

    priority: {
        type: String,
        enum: ["High", "Medium", "Low"],
        default: "Medium",
        required: true
    },

    slaDeadline: {
        type: Date,
        required: true
    },

    anonymous: {
        type: Boolean,
        default: false
    },

    evidence: {
        type: String,
        default: null
    },

    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000
    },

    status: {
        type: String,
        enum: [
            "FILED",
            "ASSIGNED",
            "IN_REVIEW",
            "RESOLVED",
            "CLOSED"
        ],
        default: "FILED"
    },

    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

    lastDecisionReason: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: ""
    },

    slaOverdueLogged: {
        type: Boolean,
        default: false
    },

    auditSequence: {
        type: Number,
        default: 0,
        min: 0
    },

    auditHash: {
        type: String,
        default: "0".repeat(64)
    }

}, { timestamps: true });

const Complaint =
    mongoose.models.Complaint ||
    mongoose.model("Complaint", complaintSchema);

export default Complaint;
