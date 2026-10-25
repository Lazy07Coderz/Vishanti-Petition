
import express from "express";
import complaintRoutes from "./routes/complaintRoutes.js";
import mongoose from "mongoose";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/authRoutes.js";

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/api/auth/", authRoutes);

app.use("/api/complaints", complaintRoutes);

const frontendPath = fileURLToPath(
    new URL("../frontend/student-portal", import.meta.url)
);

app.use(express.static(frontendPath));

app.get("/", (req, res) => {
    res.send("Vishanti Backend is running!");
});

async function startServer(){
    try{
        await mongoose.connect(process.env.MONGODB_URI, { dbName: "Vishanti" });
        console.log("Mongdb connected successfully!!!");

        app.listen(PORT,()=>{
            console.log(`Server is running on port ${PORT}`);
        });
    } catch(error){
        console.log("MongoDB connection failed..",error.message);
        process.exit(1);
    }
}

startServer();