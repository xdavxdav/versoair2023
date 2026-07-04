import { Router } from "express";
import jwt from "jsonwebtoken";

const router = Router();
const activeUsers = new Map<string, number>();
const INACTIVE_THRESHOLD = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  const entriesToDelete: string[] = [];

  activeUsers.forEach((lastSeen, sessionId) => {
    if (now - lastSeen > INACTIVE_THRESHOLD) {
      entriesToDelete.push(sessionId);
    }
  });

  entriesToDelete.forEach((sessionId) => activeUsers.delete(sessionId));
}, 60000);

router.post("/users/heartbeat", (req, res) => {
  const sessionId = req.body.sessionId || req.ip;
  activeUsers.set(sessionId, Date.now());
  res.json({
    success: true,
    activeUsers: activeUsers.size,
    sessionId,
  });
});

router.get("/users/active-count", (_req, res) => {
  const now = Date.now();
  const entriesToDelete: string[] = [];

  activeUsers.forEach((lastSeen, sessionId) => {
    if (now - lastSeen > INACTIVE_THRESHOLD) {
      entriesToDelete.push(sessionId);
    }
  });

  entriesToDelete.forEach((sessionId) => activeUsers.delete(sessionId));

  res.json({
    success: true,
    activeUsers: activeUsers.size,
    timestamp: new Date().toISOString(),
  });
});

router.get("/user", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        user: null,
        message: "No token provided",
      });
    }

    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) throw new Error("JWT_SECRET not set");
      const decoded: any = jwt.verify(token, jwtSecret);
      const isAdmin = decoded.role === "admin" || decoded.role === "superuser";

      return res.json({
        success: true,
        user: {
          id: decoded.userId || "user",
          email: decoded.email || "",
          name: decoded.name || decoded.email?.split("@")[0] || "User",
          isAdmin,
          role: decoded.role || "user",
        },
      });
    } catch {
      return res.status(401).json({
        success: false,
        user: null,
        message: "Invalid or expired token",
      });
    }
  } catch {
    res.status(500).json({
      success: false,
      user: null,
      message: "Server error",
    });
  }
});

export default router;
