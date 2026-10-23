
import express from "express";
import complaintRoutes from "./routes/complaintRoutes.js";
import mongoose from "mongoose";

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Vishanti Backend is running!");
});

app.use("/api/complaints", complaintRoutes);

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