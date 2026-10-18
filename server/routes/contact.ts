import { Router } from "express";
import * as schema from "@shared/schema";
import { db } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";
import { contactFormLimiter } from "../middleware/rate-limiter";
import { notifyZapier } from "../services/zapier-notify";
import { sendEmail } from "../services/email-service";

const router = Router();
const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) => HTML_ESCAPE_MAP[character],
  );

router.post(
  "/",
  contactFormLimiter,
  asyncHandler(async (req, res) => {
    const { name, email, phone, subject, message } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof subject !== "string" ||
      !subject.trim() ||
      typeof message !== "string" ||
      !message.trim() ||
      (phone != null && typeof phone !== "string")
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, subject, and message are required.",
      });
    }

    const contactRecipient =
      process.env.CONTACT_EMAIL ||
      process.env.ADMIN_EMAIL ||
      process.env.SMTP_USER;
    if (!contactRecipient) {
      return res.status(503).json({
        success: false,
        message: "Contact delivery is temporarily unavailable. Please try again later.",
      });
    }

    try {
      await db.insert(schema.auditLogs).values({
        action: "contact_form_submission",
        changes: {
          name: name.trim(),
          email: email.trim(),
          phone: phone?.trim() || null,
          subject: subject.trim(),
          message: message.trim(),
          submittedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.warn("[CONTACT] Submission audit log unavailable:", err);
    }

    const html = `<h3>New Contact Form Submission</h3>
      <p><strong>Name:</strong> ${escapeHtml(String(name))}</p>
      <p><strong>Email:</strong> ${escapeHtml(String(email))}</p>
      <p><strong>Phone:</strong> ${escapeHtml(String(phone || "N/A"))}</p>
      <p><strong>Subject:</strong> ${escapeHtml(String(subject))}</p>
      <p><strong>Message:</strong></p><p>${escapeHtml(String(message)).replace(/\n/g, "<br>")}</p>`;

    let delivered = false;
    try {
      delivered = await sendEmail(
        contactRecipient,
        `[Contact Form] ${String(subject)}`,
        html,
        undefined,
        String(email),
      );
    } catch (emailError) {
      console.error("[CONTACT] Email delivery failed:", emailError);
    }

    if (!delivered) {
      return res.status(503).json({
        success: false,
        message:
          "We could not confirm delivery of your message. Please try again later.",
      });
    }

    notifyZapier("contact", {
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      subject: subject.trim(),
      message: message.trim(),
    });

    res.json({
      success: true,
      message:
        "Your message was accepted by our email service. We'll get back to you soon!",
    });
  }),
);

export default router;
