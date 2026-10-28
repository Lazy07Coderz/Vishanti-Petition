import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema({
    title:{
        type: String,
        required: true,
        trim: true
    },
    category:{
        type: String,
        enum: ["Academics","Hostel & Facilities","Library","Other"],
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
    description:{
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ["FILED","ASSIGNED","IN_REVIEW","RESOLVED","CLOSED"],
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
    }


}, { timestamps: true });

const Complaint = mongoose.model("Complaint", complaintSchema);

export default Complaint;