
import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";

import User from "../models/user.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();

const registerSchema = z.object({
    name: z.string().trim().min(2).max(120),

    email: z.email().trim().toLowerCase(),

    password: z.string().min(8).refine(
        value => Buffer.byteLength(value, "utf8") <= 72,
        "Password is too long"
    )
});

const loginSchema = z.object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(1)
});

router.post("/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            message: parsed.error.issues[0]?.message ||
                "Invalid registration details"
        });
    }

    try {
        const { name, email, password } = parsed.data;

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await User.create({
            name,
            email,
            passwordHash,
            role: "STUDENT"
        });

        return res.status(201).json({
            message: "Student registered successfully",
            userId: user._id
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        console.error("Registration failed:", error);

        return res.status(500).json({
            message: "Registration failed"
        });
    }
});

router.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            message: "Enter a valid email and password"
        });
    }

    try {
        const { email, password } = parsed.data;

        const user = await User.findOne({ email });

        if (
            !user ||
            !await bcrypt.compare(password, user.passwordHash)
        ) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured");
        }

        const token = jwt.sign(
            {
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                subject: user._id.toString(),
                expiresIn: "1h",
                algorithm: "HS256"
            }
        );

        return res.status(200).json({
            message: "Login successful",
            token,

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login failed:", error);

        return res.status(500).json({
            message: "Login failed"
        });
    }
});

router.get("/me", authenticate, (req, res) => {
    res.status(200).json({
        user: req.user
    });
});

export default router;
