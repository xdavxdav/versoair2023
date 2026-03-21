import { Router } from "express";
import { db } from "../db";
import { sql, eq, and } from "drizzle-orm";
import * as schema from "@shared/schema";
import jwt from "jsonwebtoken";

const router = Router();

// GET /api/settings — all settings for current user
router.get("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    let userId: number | null = null;
    try {
      const decoded: any = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key",
      );
      userId = decoded.userId || decoded.sub;
    } catch {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not found in token" });
    }

    const settings = await db
      .select()
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, userId))
      .execute();

    const settingsBySector: Record<string, Record<string, any>> = {};
    settings.forEach((setting) => {
      if (!settingsBySector[setting.sector]) {
        settingsBySector[setting.sector] = {};
      }
      try {
        settingsBySector[setting.sector][setting.settingKey] = JSON.parse(
          setting.settingValue || setting.defaultValue || "false",
        );
      } catch {
        settingsBySector[setting.sector][setting.settingKey] =
          setting.settingValue || setting.defaultValue;
      }
    });

    res.json({ success: true, settings: settingsBySector });
  } catch (error: any) {
    console.error("Error fetching all settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch settings",
      details: error.message,
    });
  }
});

// GET /api/settings/:sector
router.get("/:sector", async (req, res) => {
  try {
    const { sector } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    let userId: number | null = null;
    try {
      const decoded: any = jwt.verify(
        token,
        process.env.JWT_SECRET || process.env.SESSION_SECRET!,
      );
      userId = decoded.userId || decoded.sub;
    } catch {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not found in token" });
    }

    const settings = await db
      .select()
      .from(schema.userSettings)
      .where(
        and(
          eq(schema.userSettings.userId, userId),
          eq(schema.userSettings.sector, sector),
        ),
      )
      .execute();

    const settingsObj: Record<string, any> = {};
    settings.forEach((setting) => {
      try {
        settingsObj[setting.settingKey] = JSON.parse(
          setting.settingValue || setting.defaultValue || "false",
        );
      } catch {
        settingsObj[setting.settingKey] =
          setting.settingValue || setting.defaultValue;
      }
    });

    res.json({ success: true, sector, settings: settingsObj });
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch settings",
      details: error.message,
    });
  }
});

// POST /api/settings/:sector
router.post("/:sector", async (req, res) => {
  try {
    const { sector } = req.params;
    const { settings } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    let userId: number | null = null;
    try {
      const decoded: any = jwt.verify(
        token,
        process.env.JWT_SECRET || process.env.SESSION_SECRET!,
      );
      userId = decoded.userId || decoded.sub;
    } catch {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    if (!userId || !settings || typeof settings !== "object") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid request" });
    }

    const updated: string[] = [];

    for (const [key, value] of Object.entries(settings)) {
      const settingValue = JSON.stringify(value);

      await db
        .insert(schema.userSettings)
        .values({
          userId,
          sector,
          settingKey: key,
          settingValue,
          dataType: typeof value,
        })
        .onConflictDoUpdate({
          target: [
            schema.userSettings.userId,
            schema.userSettings.sector,
            schema.userSettings.settingKey,
          ],
          set: {
            settingValue,
            dataType: typeof value,
            updatedAt: new Date(),
          },
        })
        .execute();

      updated.push(key);
    }

    res.json({
      success: true,
      sector,
      updated,
      message: `Updated ${updated.length} settings`,
    });
  } catch (error: any) {
    console.error("Error updating settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update settings",
      details: error.message,
    });
  }
});

export default router;
