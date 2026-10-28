
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";

export default async function authenticate(req, res, next) {
    const authorization = req.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Authentication required"
        });
    }

    const token = authorization.slice(7);

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET,
            { algorithms: ["HS256"] }
        );

        if (!mongoose.isValidObjectId(decoded.sub)) {
            return res.status(401).json({
                message: "Invalid token"
            });
        }

        const user = await User.findById(decoded.sub);

        if (!user) {
            return res.status(401).json({
                message: "User not found"
            });
        }

        req.user = {
            id: user.id,
            role: user.role
        };

        next();

    } catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError" ||
            error.name === "NotBeforeError"
        ) {
            return res.status(401).json({
                message: "Invalid or expired token"
            });
        }

        console.error(error);

        res.status(500).json({
            message: "Authentication failed"
        });
    }
}
