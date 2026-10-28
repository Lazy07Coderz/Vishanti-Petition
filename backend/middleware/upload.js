
import multer from "multer";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { extname } from "node:path";
import { randomUUID } from "node:crypto";

const uploadDir = fileURLToPath(
    new URL("../uploads/", import.meta.url)
);

mkdirSync(uploadDir, { recursive: true });

const allowedTypes = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf"
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const name = randomUUID() + allowedTypes[file.mimetype];
        cb(null, name);
    }
});

const upload = multer({
    storage,

    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    },

    fileFilter: (req, file, cb) => {
        const extension = extname(file.originalname).toLowerCase();
        const expectedExtension = allowedTypes[file.mimetype];

        const validExtension =
            extension === expectedExtension ||
            (file.mimetype === "image/jpeg" && extension === ".jpeg");

        if (!expectedExtension || !validExtension) {
            return cb(new Error("Only JPG, PNG and PDF files are allowed"));
        }

        cb(null, true);
    }
});

export function uploadEvidence(req, res, next) {
    upload.single("evidence")(req, res, (error) => {
        if (error) {
            const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;

            return res.status(status).json({
                message: error.message
            });
        }

        next();
    });
}
