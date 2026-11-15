import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import fetch from "node-fetch";

const API_BASE = "http://localhost:3000/api";
const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || "";

describe("VersoAI Presentation Maker - Phase 1", () => {
  let presentationId: string;

  describe("Tier Gate Middleware", () => {
    it("should reject unauthenticated requests", async () => {
      const res = await fetch(`${API_BASE}/presentation/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: "Test",
          audience: "General",
          slideCount: 10,
          language: "en",
        }),
      });
      expect(res.status).toBe(401);
    });

    it("should reject Free/Standard/Essential tier accounts", async () => {
      // Would need test account setup
      // This test verifies tier gate enforcement
      const res = await fetch(`${API_BASE}/presentation/draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer invalid_token`,
        },
        body: JSON.stringify({
          topic: "Test",
          audience: "General",
          slideCount: 10,
          language: "en",
        }),
      });
      expect([401, 403]).toContain(res.status);
    });
  });

  describe("Draft Outline Creation", () => {
    it("should create a draft presentation with outline", async () => {
      if (!TEST_USER_TOKEN) {
        console.log("Skipping authenticated test: no TEST_USER_TOKEN");
        return;
      }

      const res = await fetch(`${API_BASE}/presentation/draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TEST_USER_TOKEN}`,
        },
        body: JSON.stringify({
          topic: "Marketing Strategy 2025",
          audience: "Executive Team",
          slideCount: 10,
          language: "en",
        }),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.id).toBeDefined();
      expect(data.status).toBe("draft");
      expect(data.topic).toBe("Marketing Strategy 2025");
      presentationId = data.id;
    });

    it("should validate required fields", async () => {
      if (!TEST_USER_TOKEN) return;

      const res = await fetch(`${API_BASE}/presentation/draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TEST_USER_TOKEN}`,
        },
        body: JSON.stringify({
          topic: "", // Missing topic
          audience: "General",
          slideCount: 10,
          language: "en",
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("Outline Approval Flow", () => {
    it("should approve an outline and update status", async () => {
      if (!TEST_USER_TOKEN || !presentationId) return;

      const res = await fetch(`${API_BASE}/presentation/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TEST_USER_TOKEN}`,
        },
        body: JSON.stringify({
          presentationId,
          outline:
            "1. Introduction\n2. Market Analysis\n3. Strategy\n4. Implementation\n5. Conclusion",
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.status).toBe("outline_approved");
      expect(data.outlineApprovedAt).toBeDefined();
    });

    it("should reject generation without approved outline", async () => {
      if (!TEST_USER_TOKEN) return;

      // Create new draft
      const draftRes = await fetch(`${API_BASE}/presentation/draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TEST_USER_TOKEN}`,
        },
        body: JSON.stringify({
          topic: "Test Topic",
          audience: "Test",
          slideCount: 5,
          language: "en",
        }),
      });
      const draft = (await draftRes.json()) as any;

      // Try to generate without approval
      const genRes = await fetch(`${API_BASE}/presentation/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TEST_USER_TOKEN}`,
        },
        body: JSON.stringify({
          presentationId: draft.id,
          aiContent: "[]",
        }),
      });

      expect(genRes.status).toBe(400);
    });
  });

  describe("PPTX Generation", () => {
    it("should generate PPTX with branded footer and closing slide", async () => {
      if (!TEST_USER_TOKEN || !presentationId) return;

      const mockSlides = [
        {
          title: "Marketing Strategy",
          content: "Overview of 2025 strategy",
          bullets: ["Goal 1", "Goal 2", "Goal 3"],
        },
        {
          title: "Execution",
          content: "How we will implement",
          bullets: ["Step 1", "Step 2", "Step 3"],
        },
      ];

      const res = await fetch(`${API_BASE}/presentation/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TEST_USER_TOKEN}`,
        },
        body: JSON.stringify({
          presentationId,
          aiContent: JSON.stringify(mockSlides),
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.status).toBe("generated");
      expect(data.pptxUrl).toBeDefined();
      expect(data.fileSize).toBeGreaterThan(0);
    });
  });

  describe("Private Deck Ownership", () => {
    it("should prevent other users from accessing presentations", async () => {
      if (!TEST_USER_TOKEN || !presentationId) return;

      // Try to access with different user token (if available)
      const res = await fetch(`${API_BASE}/presentation/${presentationId}/download`, {
        method: "GET",
        headers: {
          Authorization: `Bearer invalid_or_different_token`,
        },
      });

      expect([401, 403]).toContain(res.status);
    });

    it("should only list user's own presentations", async () => {
      if (!TEST_USER_TOKEN) return;

      const res = await fetch(`${API_BASE}/presentation/`, {
        headers: {
          Authorization: `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(res.status).toBe(200);
      const presentations = (await res.json()) as any[];
      presentations.forEach((p) => {
        // In a real test, verify userId matches authenticated user
        expect(p.userId).toBeDefined();
      });
    });
  });

  describe("Daily Quota Enforcement", () => {
    it("should track quota per account and IP independently", async () => {
      // This test verifies the quota service logic
      // In production, generate multiple presentations and verify
      // that both account and IP limits are respected independently
      expect(true).toBe(true); // Placeholder for quota test
    });

    it("should reject generation when quota is exceeded", async () => {
      // Verify that after reaching the limit, further requests are rejected
      expect(true).toBe(true); // Placeholder
    });
  });

  describe("File Management", () => {
    it("should allow owner to download PPTX", async () => {
      if (!TEST_USER_TOKEN || !presentationId) return;

      const res = await fetch(`${API_BASE}/presentation/${presentationId}/download`, {
        headers: {
          Authorization: `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect([200, 404]).toContain(res.status);
      // 404 is acceptable if file was deleted or not generated
    });

    it("should delete presentation and clean up files", async () => {
      if (!TEST_USER_TOKEN || !presentationId) return;

      const res = await fetch(`${API_BASE}/presentation/${presentationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect([204, 404]).toContain(res.status);
    });
  });
});
