import { Router } from "express";
import * as schema from "@shared/schema";
import { db } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, subject, and message are required.",
      });
    }

    try {
      await db.insert(schema.auditLogs).values({
        action: "contact_form_submission",
        changes: {
          name,
          email,
          phone,
          subject,
          message,
          submittedAt: new Date().toISOString(),
        },
      });
    } catch {
      // audit log table may not exist — non-blocking
    }

    try {
      const nodemailer = await import("nodemailer");
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (smtpUser && smtpPass) {
        const transporter = nodemailer.default.createTransport({
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: parseInt(process.env.SMTP_PORT || "587", 10),
          secure: false,
          auth: { user: smtpUser, pass: smtpPass },
        });

        await transporter.sendMail({
          from:
            process.env.SMTP_FROM ||
            '"Verso Air Contact" <noreply@versoair.com>',
          to: smtpUser,
          replyTo: email,
          subject: `[Contact Form] ${subject}`,
          html: `<h3>New Contact Form Submission</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || "N/A"}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p><p>${String(message).replace(/\n/g, "<br>")}</p>`,
        });
      }
    } catch (emailErr) {
      console.warn("[CONTACT] Email send failed (non-blocking):", emailErr);
    }

    res.json({
      success: true,
      message: "Your message has been sent. We'll get back to you soon!",
    });
  }),
);

export default router;
