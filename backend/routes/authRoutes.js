
import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import authenticate from "../middleware/authenticate.js";

const router = Router();

const registerSchema = z.object({
    name: z.string().trim().min(2),
    email: z.email(),
    password: z.string().min(8).refine(
        value => Buffer.byteLength(value, "utf8") <= 72,
        "Password is too long"
    )
});

router.post("/register", async (req, res) => {
    try {
        const result = registerSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: result.error.issues[0].message
            });
        }

        const { name, email, password } = result.data;

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await User.create({
            name,
            email: email.trim().toLowerCase(),
            passwordHash,
            role: "STUDENT"
        });

        res.status(201).json({
            message: "Student registered successfully",
            userId: user._id
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        console.error(error);

        res.status(500).json({
            message: "Registration failed"
        });
    }
});


const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(1)
});

router.post("/login", async (req, res) => {
    try {
        const result = loginSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: "Invalid login input"
            });
        }

        const { email, password } = result.data;

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            { role: user.role },
            process.env.JWT_SECRET,
            {
                subject: user._id.toString(),
                expiresIn: "1h"
            }
        );

        res.status(200).json({
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
        console.error(error);

        res.status(500).json({
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
