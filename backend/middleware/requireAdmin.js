
export default function requireAdmin(req, res, next) {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            message: "Administrator access required"
        });
    }

    next();
}
