import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertBusinessSchema, insertReservationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(400).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(400).json({ error: "Login failed" });
    }
  });

  // Business category routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getBusinessCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/:slug", async (req, res) => {
    try {
      const category = await storage.getBusinessCategoryBySlug(req.params.slug);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch category" });
    }
  });

  // Business routes
  app.get("/api/businesses", async (req, res) => {
    try {
      const { categoryId } = req.query;
      const businesses = await storage.getBusinesses(categoryId ? parseInt(categoryId as string) : undefined);
      res.json(businesses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  app.post("/api/businesses", async (req, res) => {
    try {
      const businessData = insertBusinessSchema.parse(req.body);
      const business = await storage.createBusiness(businessData);
      res.json(business);
    } catch (error) {
      res.status(400).json({ error: "Failed to create business" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/:categorySlug", async (req, res) => {
    try {
      const analytics = await storage.getAnalyticsByCategory(req.params.categorySlug);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/business/:businessId", async (req, res) => {
    try {
      const analytics = await storage.getAnalyticsByBusiness(parseInt(req.params.businessId));
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch business analytics" });
    }
  });

  // Reservations routes
  app.get("/api/reservations", async (req, res) => {
    try {
      const reservations = await storage.getReservations();
      res.json(reservations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reservations" });
    }
  });

  app.post("/api/reservations", async (req, res) => {
    try {
      const reservationData = insertReservationSchema.parse(req.body);
      const reservation = await storage.createReservation(reservationData);
      res.json(reservation);
    } catch (error) {
      res.status(400).json({ error: "Failed to create reservation" });
    }
  });

  // Music industry routes
  app.get("/api/music/artists", async (req, res) => {
    try {
      const artists = await storage.getMusicArtists();
      res.json(artists);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artists" });
    }
  });

  app.get("/api/music/tracks", async (req, res) => {
    try {
      const tracks = await storage.getMusicTracks();
      res.json(tracks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tracks" });
    }
  });

  app.get("/api/music/analytics", async (req, res) => {
    try {
      const analytics = await storage.getMusicAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch music analytics" });
    }
  });

  // Location services
  app.get("/api/location/analytics", async (req, res) => {
    try {
      // Mock location analytics data
      const locationData = {
        currentLocation: "Paris, France",
        activeUsers: 2547,
        coverageAreas: 95,
        responseTime: "0.8s",
        regions: [
          { name: "North", coverage: 85 },
          { name: "East", coverage: 92 },
          { name: "South", coverage: 78 },
          { name: "West", coverage: 88 },
          { name: "Center", coverage: 95 }
        ]
      };
      res.json(locationData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch location analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
