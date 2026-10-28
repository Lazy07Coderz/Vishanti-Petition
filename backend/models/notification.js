
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    complaint: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Complaint",
        required: true
    },

    type: {
        type: String,
        enum: [
            "NEW_PETITION",
            "RESOLVED",
            "SLA_OVERDUE"
        ],
        required: true
    },

    message: {
        type: String,
        required: true,
        trim: true
    },

    read: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

notificationSchema.index(
    {
        recipient: 1,
        complaint: 1,
        type: 1
    },
    {
        unique: true
    }
);

notificationSchema.index({
    recipient: 1,
    createdAt: -1
});

const Notification = mongoose.model(
    "Notification",
    notificationSchema
);

export default Notification;
