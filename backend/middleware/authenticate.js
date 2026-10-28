
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/user.js";

export default async function authenticate(req, res, next) {
    const authorization = req.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Authentication required"
        });
    }

    const token = authorization.slice(7).trim();

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET,
            {
                algorithms: ["HS256"]
            }
        );

        if (!mongoose.isValidObjectId(decoded.sub)) {
            return res.status(401).json({
                message: "Invalid token"
            });
        }

        const user = await User.findById(decoded.sub)
            .select("name email role")
            .lean();

        if (!user) {
            return res.status(401).json({
                message: "User not found"
            });
        }

        req.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role
        };

        return next();

    } catch (error) {
        if ([
            "JsonWebTokenError",
            "TokenExpiredError",
            "NotBeforeError"
        ].includes(error.name)) {
            return res.status(401).json({
                message: "Invalid or expired token"
            });
        }

        console.error("Authentication failed:", error);

        return res.status(500).json({
            message: "Authentication failed"
        });
    }
}
