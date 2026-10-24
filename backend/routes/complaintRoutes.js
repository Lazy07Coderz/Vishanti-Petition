import { Router } from "express";
import Complaint from "../models/complaint.js";

const router = Router();

router.get("/",async (req, res) => {
    try{
        const complaints = await Complaint.find();
        res.status(200).json(complaints);
    } catch(error){
        res.status(500).json({
            message:"Failed to fetch complaints"
        });
    }
});

router.post("/",async (req, res) => {
    try{
        const complaint = await Complaint.create({
            title: req.body.title,
            category: req.body.category,
            anonymous: req.body.anonymous,
            description: req.body.description 
        });
        res.status(201).json(complaint);
    } catch(error){
        res.status(400).json({
            message: "Failed to create the complaint"
        });
    }
});

export default router;