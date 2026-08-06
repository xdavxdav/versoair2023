import { Express } from "express";
import { db, pool } from "./db";
import { sql, eq } from "drizzle-orm";
import databaseManagementRouter from "./routes/database-management";
import businessesRouter from "./routes/businesses";
import propertiesRouter from "./routes/properties";
import apiV1Router from "./routes/api-v1";
import authRouter from "./routes/auth";
import oauthRouter from "./routes/oauth";
import socialApiRoutes from "./routes/social-api";
import faqApiRoutes from "./routes/faq-api";
import ticketsRouter from "./routes/tickets";
import jobsRouter from "./routes/jobs";
import musicRouter from "./routes/music";
import streamroyaleRouter from "./routes/streamroyale";
import streamingRouter from "./routes/streaming";
import artistContractsRouter from "./routes/artist-contracts";
import artistsRouter from "./routes/artists";
import dataDispatchRouter from "./routes/data-dispatch";
import settingsRouter from "./routes/settings";
import homeStatsRouter from "./routes/home-stats";
import aiChatRouter from "./routes/ai-chat";
import submissionRequestsRouter from "./routes/submission-requests";
import capabilitiesRouter from "./routes/capabilities";
import evaluationsRouter from "./routes/evaluations";
import marketingRouter from "./routes/marketing";
import userHistoryRouter from "./routes/user-history";
import trackUploadRouter from "./routes/track-upload";
import artistSubscriptionsRouter from "./routes/artist-subscriptions";
import paymentsRouter from "./routes/payments";
import arenaRouter from "./routes/arena";
import vaultRouter from "./routes/vault";
import collabChainsRouter from "./routes/collab-chains";
import revenuePulseRouter from "./routes/revenue-pulse";
import walletRouter from "./routes/wallet";
import gamesRouter from "./routes/games";
import paypalRouter from "./routes/paypal";
import listenerRouter from "./routes/listener";
import beatmakerRouter from "./routes/beatmaker";
import versavidsRouter from "./routes/versavids";
import intentSearchRouter from "./routes/intent-search";
import migrateRouter from "./routes/migrate";
import escrowRouter from "./routes/escrow";
import geoSeoRouter from "./routes/geo-seo";
import businessLogoRouter from "./routes/business-logo";
import inventoryRouter from "./routes/inventory";
import inboxRouter from "./routes/inbox";
import communityRouter from "./routes/community";
import geoActionsRouter from "./routes/geo-actions";
import contractorPipelineRouter from "./routes/contractor-pipeline";
import purgatoireRouter from "./routes/purgatoire";
import { requireAuth } from "./middleware/auth";

// Map snake_case table names to camelCase schema exports
const TABLE_NAME_MAP: Record<string, string> = {
  users: "users",
  businesses: "businesses",
  business_categories: "businessCategories",
  business_hours: "businessHours",
  business_services: "businessServices",
  business_reviews: "businessReviews",
  analytics: "analytics",
  reservations: "reservations",
  ad_campaigns: "adCampaigns",
  ad_audiences: "adAudiences",
  ad_creatives: "adCreatives",
  ad_performance: "adPerformance",
  billing_history: "billingHistory",
  music_artists: "musicArtists",
  music_tracks: "musicTracks",
  music_analytics: "musicAnalytics",
  countries: "countries",
  regions: "regions",
  cities: "cities",
  target_regions: "targetRegions",
  jobs: "jobs",
  job_applications: "jobApplications",
  saved_jobs: "savedJobs",
  commerce_categories: "commerceCategories",
  payment_methods: "paymentMethods",
  transactions: "transactions",
  content_categories: "contentCategories",
  content_pages: "contentPages",
  page_categories: "pageCategories",
  notifications: "notifications",
  user_favorites: "userFavorites",
  v_campaign_performance: "vCampaignPerformance",
  artists: "artists",
  contractors: "contractors",
  payment_card_types: "paymentCardTypes",
};

import adCampaignsRouter from "./routes/ad-campaigns";
import adminRouter from "./routes/admin";
import astrologyRouter from "./routes/astrology";
import businessSearchRouter from "./routes/business-search";
import categoriesRouter from "./routes/categories";
import commerceAdsRouter from "./routes/commerce-ads";
import contactRouter from "./routes/contact";
import geoRouter from "./routes/geo";
import publicStatsRouter from "./routes/public-stats";
import seedRouter from "./routes/seed";
import systemRouter from "./routes/system";
import usersRouter from "./routes/users";
export async function registerRoutes(app: Express) {
  // Register auth routes
  app.use("/auth", authRouter);
  app.use("/auth", oauthRouter);

  // ═══════════════════════════════════════════════════════════
  // 🔐 VAULT AUTHORIZATION — superadmin@versoair.test ONLY
  // Even other superusers are denied. No exceptions.
  // ═══════════════════════════════════════════════════════════
  app.get("/api/vault/authorize", requireAuth(), async (req, res) => {
    const VAULT_MASTER_EMAIL = "superadmin@versoair.test";
    const user = req.user;

    if (
      !user ||
      user.email !== VAULT_MASTER_EMAIL ||
      user.role !== "superuser"
    ) {
      console.log(
        `🔒 Vault access DENIED for: ${user?.email || "unknown"} (role: ${user?.role || "none"})`,
      );
      return res.status(403).json({
        success: false,
        authorized: false,
        error: "VAULT_ACCESS_DENIED",
        message: "You are not authorized to access the credentials vault.",
      });
    }

    console.log(`🔓 Vault access GRANTED for: ${user.email}`);
    res.json({
      success: true,
      authorized: true,
      identity: user.email,
    });
  });

  // Register API v1 routes
  app.use("/api/v1", apiV1Router);

  // Register social blog API routes
  app.use("/api/social", socialApiRoutes);

  // Register FAQ API routes
  app.use("/api/faq", faqApiRoutes);

  // Register VersoAI chat routes
  app.use("/api/ai", aiChatRouter);

  // ── Contact form endpoint ──
  app.use("/api/contact", contactRouter);

  // Register database management routes (admin CRUD for categories, countries, etc.)
  // Mounted at /api/manage to avoid blocking public /api/* endpoints
  app.use("/api/manage", databaseManagementRouter);

  // ── Public proxy routes for regions & cities ──
  // The database-management router is mounted at /api/manage, but frontend components
  // (dashboard-admin, BusinessForm, geo-admin) call /api/regions and /api/cities directly.
  // Forward these public GET endpoints so cascading Country → Region → City works.
  app.use("/api", geoRouter);

  // Register businesses routes
  app.use("/", businessesRouter);

  // Register properties routes
  app.use("/", propertiesRouter);

  // Register extracted domain routers
  app.use("/api/tickets", ticketsRouter);
  app.use("/api/jobs", jobsRouter);
  app.use("/api/music", musicRouter);
  app.use("/api/streamroyale", streamroyaleRouter);

  // ─── PREVIEW ROUTE (must come before streaming router to avoid :id catch) ───
  app.get("/api/streaming/tracks/:id/preview", async (req, res) => {
    try {
      const trackId = parseInt(req.params.id);
      if (!trackId || isNaN(trackId)) {
        return res.status(400).json({ error: "Invalid track ID" });
      }

      // Fetch track details (simple query)
      const trackResult = await pool.query(
        `SELECT mt.id, mt.title, mt.audio_url, mt.file_path, mt.duration, mt.cover_art, ma.name as artist_name
         FROM music_tracks mt
         LEFT JOIN music_artists ma ON ma.id = mt.artist_id
         WHERE mt.id = $1`,
        [trackId],
      );

      if (trackResult.rows.length === 0) {
        return res.status(404).json({ error: "Track not found" });
      }

      const track = trackResult.rows[0];

      // Return preview metadata (frontend handles 30-second clip playback)
      res.json({
        trackId: track.id,
        title: track.title,
        artistName: track.artist_name || "Unknown Artist",
        coverUrl: track.cover_art,
        previewUrl: track.audio_url || track.file_path,
        fullDuration: track.duration,
        previewDuration: 30,
        previewBitrate: 128,
        isPreview: true,
        seekable: true,
        quotaImpact: 0,
      });
    } catch (err: any) {
      console.error("[PREVIEW] error:", err.message);
      res.status(500).json({ error: "Failed to load preview" });
    }
  });

  app.use("/api/streaming", streamingRouter);
  app.use("/api/contracts", artistContractsRouter);
  app.use("/api/artists", artistsRouter);
  app.use("/api/data/dispatch", dataDispatchRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/home", homeStatsRouter);
  app.use("/api/request", submissionRequestsRouter);
  app.use("/api/user", capabilitiesRouter);
  app.use("/api", evaluationsRouter);

  // Register marketing platform routes (journal, packs, print, cart, orders, newsletters)
  app.use("/api/marketing", marketingRouter);

  // Business logo upload (paid tiers only)
  app.use("/api/business-logo", businessLogoRouter);

  // Register user browsing history routes
  app.use("/api/user/history", userHistoryRouter);

  // ═══ Enhanced Streaming System Routes ═══
  app.use("/api/tracks", trackUploadRouter); // Track upload & management
  app.use("/api/artist-subscriptions", artistSubscriptionsRouter); // Spark/Flame/Blaze/Inferno tiers
  app.use("/api/artist", artistSubscriptionsRouter); // Alias: /api/artist/tiers, /api/artist/subscribe, etc.
  app.use("/api/payments", paymentsRouter); // Wallet, payment methods, bank transfers
  app.use("/api/arena", arenaRouter); // StreamRoyale Arena battle royale
  app.use("/api/purgatoire", purgatoireRouter); // Track moderation queue
  app.use("/api/vault", vaultRouter); // Verso Vault exclusivity engine
  app.use("/api/collab-chains", collabChainsRouter); // Collab Chains viral remix system
  app.use("/api/revenue-pulse", revenuePulseRouter); // Revenue Pulse transparency dashboard
  app.use("/api/wallet", walletRouter); // Credits wallet (balance, deposit, game rewards)
  app.use("/api/games", gamesRouter); // PvP skill games (trivia, prediction, card battle)
  app.use("/api/paypal", paypalRouter); // PayPal checkout (create order, capture, config)
  app.use("/api/listener", listenerRouter); // Listener Portal — stats, bonuses, XP tracking
  app.use("/api/beatmaker", beatmakerRouter); // Beatmaker Studio — production requests & briefs
  app.use("/api/versavids", versavidsRouter); // VersaVids — video production marketplace & briefs
  app.use("/api/search", intentSearchRouter); // Intent Search — Shared Brain AI search endpoint
  app.use("/api/migrate", migrateRouter); // Market Raider — competitor scraping & import
  app.use("/api/escrow", escrowRouter); // Escrow — trustless transaction engine
  app.use("/api/seo", geoSeoRouter); // GEO SEO — JSON-LD, sitemap, robots.txt
  app.use("/api/inventory", inventoryRouter); // Inventory — sector-adaptive product & stock management
  app.use("/api/inbox", inboxRouter); // Inbox — Support tickets + Business Networking (VersoAI)
  app.use("/api/community", communityRouter); // Community Hub — Fan Wall (ungated, slow-mode for spam)
  app.use("/api/geo-actions", geoActionsRouter); // Geo-Action Queue — tiered geo-admin access control
  app.use("/api/contractor-pipeline", contractorPipelineRouter); // Contractor Pipeline — apply → verify → assign

  // ─── CSRF token endpoint (returns token in response body for clients where cookies don't work) ───
  app.get("/api/csrf-token", (req, res) => {
    const token = res.locals.csrfToken;
    if (token) {
      res.json({ success: true, csrfToken: token });
    } else {
      res
        .status(500)
        .json({ success: false, message: "CSRF token not generated" });
    }
  });

  // ─── Business Categories endpoint (used by geo-admin dashboard) ───
  app.use("/api", categoriesRouter);

  // ─── Ad Campaigns endpoint (used by geo-admin dashboard) ───
  app.use("/api/ad-campaigns", adCampaignsRouter);

  // Health check endpoint
  app.use("/api", systemRouter);

  // ========== PUBLIC JOBS SEARCH ==========
  // Public endpoint for the Career Portal — reads from the same `jobs` table
  // that Admin Dashboard writes to. No auth required.
  // jobs/search handled by jobsRouter

  // ========== PUBLIC DASHBOARD STATS ==========
  // Get public dashboard statistics (no auth required)
  // Supports optional category filter to show industry-relevant stats
  app.use("/api/public", publicStatsRouter);

  // Helper: Get industry-relevant metrics for a category
  // Maps to the 7 main sectors + subcategories from FSA system
  function getIndustryRelevantMetrics(category: string) {
    const categoryLower = category.toLowerCase();

    // ========== MAIN SECTORS (7 CORE) ==========

    // 1. COMMERCE (Retail shops, supermarkets, department stores)
    if (
      categoryLower.includes("commerce") ||
      categoryLower.includes("retail") ||
      categoryLower.includes("shop") ||
      categoryLower.includes("store") ||
      categoryLower.includes("supermarket") ||
      categoryLower.includes("department") ||
      categoryLower.includes("shopping") ||
      categoryLower.includes("mall")
    ) {
      return {
        primary: [
          "Product Views",
          "Sales Revenue",
          "Foot Traffic",
          "Customer Reviews",
        ],
        secondary: [
          "Inventory Turnover",
          "Average Transaction Value",
          "Product Categories",
        ],
        tertiary: [
          "Conversion Rate",
          "Customer Retention",
          "Peak Shopping Hours",
        ],
        metrics: {
          "Foot Traffic": "Daily store visitors",
          "Sales Revenue": "Daily/weekly sales",
          "Product Views": "Online product page views",
          "Customer Reviews": "Average rating",
          "Inventory Turnover": "Stock movement",
          "Conversion Rate": "Visitor to buyer %",
        },
      };
    }

    // 2. HOTELLERIE / TOURISM & LEISURE
    if (
      categoryLower.includes("hotel") ||
      categoryLower.includes("tourism") ||
      categoryLower.includes("leisure") ||
      categoryLower.includes("lodging") ||
      categoryLower.includes("accommodation") ||
      categoryLower.includes("hostel") ||
      categoryLower.includes("guesthouse") ||
      categoryLower.includes("resort") ||
      categoryLower.includes("travel")
    ) {
      return {
        primary: [
          "Room Occupancy Rate",
          "Reservations",
          "Guest Reviews",
          "Average Daily Rate",
        ],
        secondary: ["Booking Channels", "Length of Stay", "Cancellation Rate"],
        tertiary: ["Repeat Visitors", "Staff Satisfaction", "Events Hosted"],
        metrics: {
          "Room Occupancy Rate": "% rooms booked daily",
          Reservations: "Bookings per week",
          "Guest Reviews": "Average satisfaction",
          "Average Daily Rate": "€ per night",
          "Booking Channels": "Direct vs OTA",
          "Repeat Visitors": "% returning guests",
        },
      };
    }

    // 3. BATIMENT / BUILDING & CONSTRUCTION
    if (
      categoryLower.includes("construction") ||
      categoryLower.includes("building") ||
      categoryLower.includes("batiment") ||
      categoryLower.includes("civil engineering") ||
      categoryLower.includes("contractor") ||
      categoryLower.includes("electrical") ||
      categoryLower.includes("plumbing") ||
      categoryLower.includes("hvac")
    ) {
      return {
        primary: [
          "Projects Completed",
          "Active Projects",
          "Client Reviews",
          "Safety Record",
        ],
        secondary: ["Project Value", "License Status", "Insurance Coverage"],
        tertiary: ["Repeat Clients", "On-Time Completion", "Cost Efficiency"],
        metrics: {
          "Projects Completed": "Completed this month",
          "Active Projects": "Ongoing projects",
          "Client Reviews": "Average rating",
          "Safety Record": "Incidents/incidents-free days",
          "License Status": "Current certifications",
          "Project Value": "Average project cost",
        },
      };
    }

    // 4. AUTOMOBILE & MOTORBIKE
    if (
      categoryLower.includes("automobile") ||
      categoryLower.includes("automotive") ||
      categoryLower.includes("motorbike") ||
      categoryLower.includes("motorcycle") ||
      categoryLower.includes("car") ||
      categoryLower.includes("dealer") ||
      categoryLower.includes("mechanic") ||
      categoryLower.includes("garage") ||
      categoryLower.includes("auto service")
    ) {
      return {
        primary: [
          "Service Appointments",
          "Test Drive Requests",
          "Customer Reviews",
          "Vehicles Sold",
        ],
        secondary: [
          "Inventory Status",
          "Average Service Cost",
          "Repair Completion Time",
        ],
        tertiary: [
          "Parts Availability",
          "Warranty Claims",
          "Customer Retention",
        ],
        metrics: {
          "Service Appointments": "Bookings per week",
          "Test Drive Requests": "Requests per week",
          "Vehicles Sold": "Sales this month",
          "Customer Reviews": "Average rating",
          "Inventory Status": "Available vehicles",
          "Repair Completion": "Average days",
        },
      };
    }

    // 5. FINANCE (Banks, insurance, loans, investment)
    if (
      categoryLower.includes("finance") ||
      categoryLower.includes("bank") ||
      categoryLower.includes("insurance") ||
      categoryLower.includes("loan") ||
      categoryLower.includes("investment") ||
      categoryLower.includes("microfinance")
    ) {
      return {
        primary: [
          "Accounts Opened",
          "Loan Applications",
          "Assets Under Management",
          "Client Trust Score",
        ],
        secondary: [
          "Interest Rates Offered",
          "Approval Rate",
          "Average Loan Size",
        ],
        tertiary: [
          "Customer Lifetime Value",
          "Regulatory Compliance",
          "Referral Rate",
        ],
        metrics: {
          "Accounts Opened": "This month",
          "Loan Applications": "Processing",
          "Assets Under Management": "Total AUM",
          "Client Trust Score": "Rating/reviews",
          "Approval Rate": "% approved applications",
          "Average Loan Size": "€ per loan",
        },
      };
    }

    // 6. ENTERTAINMENT / DIVERTISSEMENT (Events, music, cinema, nightlife)
    if (
      categoryLower.includes("entertainment") ||
      categoryLower.includes("divertissement") ||
      categoryLower.includes("event") ||
      categoryLower.includes("music") ||
      categoryLower.includes("cinema") ||
      categoryLower.includes("nightlife") ||
      categoryLower.includes("nightclub") ||
      categoryLower.includes("concert")
    ) {
      return {
        primary: [
          "Events Hosted",
          "Attendance/Tickets",
          "Customer Ratings",
          "Venue Capacity Used",
        ],
        secondary: [
          "Ticket Sales Revenue",
          "Artist/Performer Lineup",
          "Event Frequency",
        ],
        tertiary: [
          "Repeat Visitors",
          "Social Media Reach",
          "Partnership Opportunities",
        ],
        metrics: {
          "Events Hosted": "Events this month",
          Attendance: "Total visitors/ticket sales",
          "Customer Ratings": "Average event rating",
          "Ticket Sales": "€ revenue",
          "Venue Utilization": "% capacity used",
          "Repeat Visitors": "% returning",
        },
      };
    }

    // ========== ADDITIONAL CATEGORIES ==========

    // Healthcare (Doctors, clinics, hospitals)
    if (
      categoryLower.includes("health") ||
      categoryLower.includes("medical") ||
      categoryLower.includes("doctor") ||
      categoryLower.includes("clinic") ||
      categoryLower.includes("hospital") ||
      categoryLower.includes("pharmacy") ||
      categoryLower.includes("dental")
    ) {
      return {
        primary: [
          "Patient Appointments",
          "Patient Reviews",
          "Services Offered",
        ],
        secondary: [
          "Insurance Accepted",
          "Specialist Credentials",
          "Treatment Options",
        ],
        tertiary: ["Patient Retention", "Consultation Time", "Outcomes"],
        metrics: {
          "Patient Appointments": "Bookings per week",
          "Patient Reviews": "Average rating",
          "Services Offered": "Number of specialties",
          "Insurance Accepted": "Providers",
          "Specialist Rating": "Credentials/certifications",
          "Patient Retention": "% returning patients",
        },
      };
    }

    // Restaurant/Cafe/Bar
    if (
      categoryLower.includes("restaurant") ||
      categoryLower.includes("cafe") ||
      categoryLower.includes("bar") ||
      categoryLower.includes("food") ||
      categoryLower.includes("beverage") ||
      categoryLower.includes("pizzeria") ||
      categoryLower.includes("bistro")
    ) {
      return {
        primary: [
          "Table Bookings",
          "Menu Clicks",
          "Food Orders",
          "Customer Reviews",
        ],
        secondary: [
          "Delivery Orders",
          "Average Order Value",
          "Peak Hours Traffic",
        ],
        tertiary: ["Staff Efficiency", "Food Waste Rate", "Customer Loyalty"],
        metrics: {
          "Table Bookings": "Reservations per day",
          "Menu Clicks": "Online menu views",
          "Food Orders": "Orders per day",
          "Delivery Orders": "3rd party platforms",
          "Average Order Value": "€ per order",
          "Customer Satisfaction": "Average rating",
        },
      };
    }

    // Professional Services (Lawyers, accountants, consultants)
    if (
      categoryLower.includes("law") ||
      categoryLower.includes("legal") ||
      categoryLower.includes("consultant") ||
      categoryLower.includes("accountant") ||
      categoryLower.includes("auditor")
    ) {
      return {
        primary: [
          "Client Enquiries",
          "Cases/Projects",
          "Client Reviews",
          "Consultation Rate",
        ],
        secondary: [
          "Service Specializations",
          "Success Rate",
          "Industry Expertise",
        ],
        tertiary: ["Referral Rate", "Client Retention", "Professional Rating"],
        metrics: {
          "Client Enquiries": "Inquiries per week",
          "Cases/Projects": "Active matters",
          "Client Reviews": "Average rating",
          Specializations: "Service areas",
          "Success Rate": "Case/project success %",
          "Referral Rate": "% new clients from referrals",
        },
      };
    }

    // SPORTS & FITNESS (Gyms, clubs, sports facilities)
    if (
      categoryLower.includes("sport") ||
      categoryLower.includes("fitness") ||
      categoryLower.includes("gym") ||
      categoryLower.includes("club") ||
      categoryLower.includes("athletic") ||
      categoryLower.includes("training") ||
      categoryLower.includes("yoga")
    ) {
      return {
        primary: [
          "Active Members",
          "Classes/Events",
          "Member Reviews",
          "Facilities Utilization",
        ],
        secondary: [
          "Membership Revenue",
          "Class Attendance",
          "Personal Training Sessions",
        ],
        tertiary: [
          "Member Retention",
          "Community Engagement",
          "Coach/Trainer Rating",
        ],
        metrics: {
          "Active Members": "Current memberships",
          "Classes/Events": "Per week",
          "Member Reviews": "Average rating",
          "Facilities Utilization": "% capacity used",
          "Membership Revenue": "Monthly recurring",
          "Class Attendance": "Avg per class",
          "Retention Rate": "% members staying",
          "Coach Rating": "Average rating by members",
        },
      };
    }

    // Default/Generic fallback
    return {
      primary: ["Customer Reviews", "Active Listings", "Engagement"],
      secondary: ["Customer Satisfaction", "Response Time"],
      tertiary: ["Market Reach", "Growth Rate"],
      metrics: {
        "Customer Reviews": "Average rating",
        "Active Listings": "Current offerings",
        Engagement: "Customer interactions",
        "Response Time": "Average reply time",
        "Customer Satisfaction": "Overall rating",
      },
    };
  }

  // Helper: Generate realistic stats for a business
  function generateBusinessStats(
    category: string,
    rating: number,
    reviewCount: number,
  ) {
    const engagementMultiplier =
      (rating / 5) * (Math.log(reviewCount + 1) / 4 + 1);
    const categoryLower = category.toLowerCase();

    // ========== MAIN SECTORS ==========

    // 1. COMMERCE (Retail)
    if (
      categoryLower.includes("commerce") ||
      categoryLower.includes("retail") ||
      categoryLower.includes("shop") ||
      categoryLower.includes("store") ||
      categoryLower.includes("supermarket")
    ) {
      return {
        productViews: Math.round(1200 * engagementMultiplier),
        salesRevenue: Math.round(4500 * engagementMultiplier),
        footTraffic: Math.round(350 * engagementMultiplier),
        customerReviews: reviewCount,
        inventoryTurnover: (rating * 18).toFixed(1),
        conversionRate: (rating * 3.5).toFixed(1),
        averageTransaction: Math.round(45 * engagementMultiplier),
        customerRetention: (rating * 16).toFixed(1),
      };
    }

    // 2. HOTELLERIE (Hotels, Tourism)
    if (
      categoryLower.includes("hotel") ||
      categoryLower.includes("tourism") ||
      categoryLower.includes("lodging") ||
      categoryLower.includes("accommodation")
    ) {
      return {
        roomOccupancy: (rating * 16).toFixed(1),
        reservations: Math.round(50 * engagementMultiplier),
        guestReviews: reviewCount,
        averageDailyRate: Math.round(125 * engagementMultiplier),
        bookingChannels: Math.round(5 * engagementMultiplier),
        lengthOfStay: (3.5 * (rating / 5)).toFixed(1),
        cancellationRate: (100 - rating * 15).toFixed(1),
        repeatVisitors: (rating * 18).toFixed(1),
      };
    }

    // 3. BATIMENT (Construction)
    if (
      categoryLower.includes("construction") ||
      categoryLower.includes("building") ||
      categoryLower.includes("batiment") ||
      categoryLower.includes("contractor")
    ) {
      return {
        projectsCompleted: Math.round(8 * engagementMultiplier),
        activeProjects: Math.round(5 * engagementMultiplier),
        clientReviews: reviewCount,
        safetyRecord: (rating * 19).toFixed(1),
        licenseStatus: "Current",
        projectValue: Math.round(75000 * engagementMultiplier),
        repeatClients: (rating * 20).toFixed(1),
        onTimeCompletion: (rating * 19).toFixed(1),
      };
    }

    // 4. AUTOMOBILE
    if (
      categoryLower.includes("automobile") ||
      categoryLower.includes("automotive") ||
      categoryLower.includes("motorbike") ||
      categoryLower.includes("mechanic") ||
      categoryLower.includes("garage")
    ) {
      return {
        serviceAppointments: Math.round(35 * engagementMultiplier),
        testDriveRequests: Math.round(12 * engagementMultiplier),
        vehiclesSold: Math.round(8 * engagementMultiplier),
        customerReviews: reviewCount,
        inventoryStatus: Math.round(25 * engagementMultiplier),
        averageServiceCost: Math.round(350 * engagementMultiplier),
        repairCompletionDays: Math.max(1, Math.round(5 - rating)),
        customerRetention: (rating * 17).toFixed(1),
      };
    }

    // 5. FINANCE
    if (
      categoryLower.includes("finance") ||
      categoryLower.includes("bank") ||
      categoryLower.includes("insurance") ||
      categoryLower.includes("loan")
    ) {
      return {
        accountsOpened: Math.round(45 * engagementMultiplier),
        loanApplications: Math.round(28 * engagementMultiplier),
        assetsUnderManagement: Math.round(2500000 * engagementMultiplier),
        clientTrustScore: (rating * 20).toFixed(1),
        interestRates: (4.5 * (rating / 5)).toFixed(2),
        approvalRate: (70 + rating * 4).toFixed(1),
        averageLoanSize: Math.round(45000 * engagementMultiplier),
        referralRate: (rating * 12).toFixed(1),
      };
    }

    // 6. ENTERTAINMENT
    if (
      categoryLower.includes("entertainment") ||
      categoryLower.includes("divertissement") ||
      categoryLower.includes("event") ||
      categoryLower.includes("music") ||
      categoryLower.includes("cinema")
    ) {
      return {
        eventsHosted: Math.round(12 * engagementMultiplier),
        attendance: Math.round(450 * engagementMultiplier),
        customerRatings: reviewCount,
        ticketSalesRevenue: Math.round(8500 * engagementMultiplier),
        venueCapacityUsed: (rating * 17).toFixed(1),
        artistLineup: Math.round(4 * engagementMultiplier),
        eventFrequency: "Weekly",
        repeatVisitors: (rating * 19).toFixed(1),
      };
    }

    // ========== ADDITIONAL CATEGORIES ==========

    // HEALTHCARE
    if (
      categoryLower.includes("health") ||
      categoryLower.includes("medical") ||
      categoryLower.includes("doctor") ||
      categoryLower.includes("clinic")
    ) {
      return {
        patientAppointments: Math.round(85 * engagementMultiplier),
        patientReviews: reviewCount,
        servicesOffered: Math.round(12 * engagementMultiplier),
        insuranceAccepted: Math.round(8 * engagementMultiplier),
        specialistRating: (rating * 20).toFixed(1),
        patientRetention: (rating * 18).toFixed(1),
        consultationTime: "30-45 min",
        treatmentSuccess: (rating * 19).toFixed(1),
      };
    }

    // RESTAURANT/CAFE/BAR
    if (
      categoryLower.includes("restaurant") ||
      categoryLower.includes("cafe") ||
      categoryLower.includes("bar") ||
      categoryLower.includes("food")
    ) {
      return {
        tableBookings: Math.round(50 * engagementMultiplier),
        menuClicks: Math.round(900 * engagementMultiplier),
        foodOrders: Math.round(75 * engagementMultiplier),
        customerReviews: reviewCount,
        deliveryOrders: Math.round(35 * engagementMultiplier),
        averageOrderValue: Math.round(38 * engagementMultiplier),
        peakHourTraffic: (rating * 22).toFixed(1),
        staffEfficiency: (rating * 19).toFixed(1),
      };
    }

    // PROFESSIONAL SERVICES (Lawyers, consultants)
    if (
      categoryLower.includes("law") ||
      categoryLower.includes("legal") ||
      categoryLower.includes("consultant") ||
      categoryLower.includes("accountant")
    ) {
      return {
        clientEnquiries: Math.round(35 * engagementMultiplier),
        casesProjects: Math.round(15 * engagementMultiplier),
        clientReviews: reviewCount,
        consultationRate: Math.round(85 * engagementMultiplier),
        specializations: Math.round(5 * engagementMultiplier),
        successRate: (rating * 19).toFixed(1),
        referralRate: (rating * 14).toFixed(1),
        clientRetention: (rating * 20).toFixed(1),
      };
    }

    // SPORTS & FITNESS (Gyms, clubs, sports facilities)
    if (
      categoryLower.includes("sport") ||
      categoryLower.includes("fitness") ||
      categoryLower.includes("gym") ||
      categoryLower.includes("recreation") ||
      categoryLower.includes("wellness") ||
      categoryLower.includes("athletic") ||
      categoryLower.includes("training") ||
      categoryLower.includes("yoga")
    ) {
      return {
        activeMembers: Math.round(85 * engagementMultiplier),
        classesEvents: Math.round(18 * engagementMultiplier),
        memberReviews: reviewCount,
        facilitiesUtilization: (rating * 17).toFixed(1),
        membershipRevenue: Math.round(8500 * engagementMultiplier),
        classAttendance: Math.round(28 * engagementMultiplier),
        personalTraining: Math.round(12 * engagementMultiplier),
        memberRetention: (rating * 19).toFixed(1),
      };
    }

    // REAL ESTATE (Agencies, developers, property management)
    if (
      categoryLower.includes("real estate") ||
      categoryLower.includes("property") ||
      categoryLower.includes("realtor") ||
      categoryLower.includes("developer")
    ) {
      return {
        activeListings: Math.round(45 * engagementMultiplier),
        propertySales: Math.round(8 * engagementMultiplier),
        prospectEnquiries: Math.round(65 * engagementMultiplier),
        averagePropertyValue: Math.round(250000 * engagementMultiplier),
        clientReviews: reviewCount,
        leaseNegotiations: Math.round(15 * engagementMultiplier),
        marketOccupancy: (rating * 16).toFixed(1),
        clientRetention: (rating * 18).toFixed(1),
      };
    }

    // IT & INTERNET (Software, hosting, digital services)
    if (
      categoryLower.includes("software") ||
      categoryLower.includes("it") ||
      categoryLower.includes("internet") ||
      categoryLower.includes("hosting") ||
      categoryLower.includes("cloud") ||
      categoryLower.includes("cybersecurity") ||
      categoryLower.includes("ecommerce") ||
      categoryLower.includes("web design")
    ) {
      return {
        activeProjects: Math.round(12 * engagementMultiplier),
        clientCount: Math.round(45 * engagementMultiplier),
        serviceTickets: Math.round(85 * engagementMultiplier),
        systemUptime: (98 + rating * 0.8).toFixed(2),
        clientReviews: reviewCount,
        averageProjectValue: Math.round(15000 * engagementMultiplier),
        technicalSupport: Math.round(95 * engagementMultiplier),
        clientSatisfaction: (rating * 20).toFixed(1),
      };
    }

    // COMMUNICATION & ADVERTISING (Agencies, events, media)
    if (
      categoryLower.includes("communication") ||
      categoryLower.includes("advertising") ||
      categoryLower.includes("marketing") ||
      categoryLower.includes("event") ||
      categoryLower.includes("media") ||
      categoryLower.includes("design") ||
      categoryLower.includes("photography")
    ) {
      return {
        activeCampaigns: Math.round(8 * engagementMultiplier),
        clientProjects: Math.round(20 * engagementMultiplier),
        eventAttendance: Math.round(450 * engagementMultiplier),
        campaignReach: Math.round(25000 * engagementMultiplier),
        clientReviews: reviewCount,
        averageProjectBudget: Math.round(8500 * engagementMultiplier),
        campaignROI: (85 + rating * 5).toFixed(1),
        clientRetention: (rating * 19).toFixed(1),
      };
    }

    // FOOD & BEVERAGE (Producers, distributors, suppliers)
    if (
      categoryLower.includes("food") ||
      categoryLower.includes("beverage") ||
      categoryLower.includes("producer") ||
      categoryLower.includes("distributor")
    ) {
      return {
        productsSold: Math.round(250 * engagementMultiplier),
        customerOrders: Math.round(85 * engagementMultiplier),
        supplierNetwork: Math.round(35 * engagementMultiplier),
        averageOrderValue: Math.round(120 * engagementMultiplier),
        customerReviews: reviewCount,
        inventoryTurnover: (rating * 18).toFixed(1),
        qualityRating: (rating * 20).toFixed(1),
        deliveryOnTime: (95 + rating * 2).toFixed(1),
      };
    }

    // EDUCATION (Schools, training, courses)
    if (
      categoryLower.includes("education") ||
      categoryLower.includes("training") ||
      categoryLower.includes("school") ||
      categoryLower.includes("course") ||
      categoryLower.includes("university")
    ) {
      return {
        totalStudents: Math.round(150 * engagementMultiplier),
        activeEnrollments: Math.round(45 * engagementMultiplier),
        courseOfferings: Math.round(25 * engagementMultiplier),
        graduationRate: (80 + rating * 5).toFixed(1),
        studentReviews: reviewCount,
        instructorRating: (rating * 20).toFixed(1),
        placementRate: (70 + rating * 8).toFixed(1),
        studentRetention: (rating * 18).toFixed(1),
      };
    }

    // TRANSPORTATION & LOGISTICS (Shipping, taxi, delivery)
    if (
      categoryLower.includes("transport") ||
      categoryLower.includes("shipping") ||
      categoryLower.includes("taxi") ||
      categoryLower.includes("delivery") ||
      categoryLower.includes("logistics")
    ) {
      return {
        activeDeliveries: Math.round(125 * engagementMultiplier),
        vehicleFleet: Math.round(35 * engagementMultiplier),
        customerRatings: reviewCount,
        deliverySuccessRate: (95 + rating * 2).toFixed(1),
        averageDeliveryTime: Math.max(30, Math.round(90 - rating * 15)),
        routesOperating: Math.round(12 * engagementMultiplier),
        onTimePercentage: (90 + rating * 5).toFixed(1),
        customerSatisfaction: (rating * 20).toFixed(1),
      };
    }

    // DEFAULT
    return {
      customerReviews: reviewCount,
      activeListings: Math.round(8 * engagementMultiplier),
      engagement: Math.round(100 * engagementMultiplier),
      customerSatisfaction: (rating * 20).toFixed(1),
      responseTime: "< 2 hours",
      marketReach: (rating * 15).toFixed(1),
      growthRate: (Math.random() * 15 + 5).toFixed(1),
    };
  }

  // Seed categories endpoint (development only)
  app.use("/api", seedRouter);

  // Active users endpoints
  app.use("/api", usersRouter);

  app.use("/api/admin", adminRouter);
  // /api/tables handled by systemRouter above
  app.use("/api/commerce", commerceAdsRouter);
  app.use("/api", businessSearchRouter);
  app.use("/api", astrologyRouter);

  // ========== TICKETING ENDPOINTS (EXTRACTED → server/routes/tickets.ts) ==========
  // Handled by ticketsRouter registered above

  // ========== JOBS / CAREERS ENDPOINTS (EXTRACTED → server/routes/jobs.ts) ==========
  // Handled by jobsRouter registered above

  // Test database connection
  app.get("/api/business/test-connection", async (req, res) => {
    try {
      const testResult = await db.execute(sql`
        SELECT 
          NOW() as time,
          current_database() as database,
          version() as version,
          (SELECT COUNT(*) FROM businesses) as business_count,
          (SELECT COUNT(*) FROM business_categories) as category_count
      `);

      const row = testResult.rows[0];

      res.json({
        success: true,
        database: {
          connected: true,
          name: row?.database,
          version: row?.version,
          time: row?.time,
          businessCount: row?.business_count,
          categoryCount: row?.category_count,
        },
        server: {
          status: "running",
          environment: process.env.NODE_ENV || "development",
        },
      });
    } catch (error: any) {
      console.error("❌ Database test failed:", error);
      res.json({
        success: false,
        database: {
          connected: false,
          error: error.message,
        },
        server: {
          status: "running",
          environment: process.env.NODE_ENV || "development",
        },
      });
    }
  });

  // ========== ARTIST DIRECTORY (EXTRACTED → server/routes/music.ts) ==========
  // Handled by musicRouter registered above
  // 404 handler
  app.use("/api/*", (req, res) => {
    res.status(404).json({
      success: false,
      error: "API endpoint not found",
      path: req.originalUrl,
      method: req.method,
      availableEndpoints: [
        "GET /api/status",
        "GET /api/simple-test",
        "GET /api/countries",
        "GET /api/businesses",
        "GET /api/businesses/pool/:categoryName",
        "GET /api/business/search",
        "GET /api/business/categories",
        "GET /api/business/locations",
        "GET /api/business/test-connection",
        "GET /api/commerce/analytics",
        "GET /api/commerce/ads/search",
        "GET /api/properties/analytics",
        "GET /api/properties/search",
        "GET /api/jobs",
        "GET /api/jobs/search",
        "POST /api/jobs/generate-random",
        "POST /api/jobs/:id/apply",
        "POST /api/jobs/:id/save",
        "POST /api/jobs/:id/unsave",
        "GET /api/music/artists",
        "GET /api/music/artists/:id",
        "GET /api/music/tracks",
        "GET /api/music/analytics",
        "POST /api/music/artists/generate-random",
        "GET /api/admin/database-stats",
        "GET /api/admin/table/:tableName",
        "POST /api/admin/table/:tableName",
        "PUT /api/admin/table/:tableName/:id",
        "DELETE /api/admin/table/:tableName/:id",
        "GET /api/debug/businesses-structure",
        "GET /api/debug/countries",
        "POST /api/data/dispatch/categories",
        "GET /api/data/dispatch/status",
        "GET /api/settings",
        "GET /api/settings/:sector",
        "POST /api/settings/:sector",
        "GET /api/marketing/journal/listings",
        "POST /api/marketing/journal/listings",
        "GET /api/marketing/journal/pdf/:type",
        "GET /api/marketing/packs",
        "GET /api/marketing/print/products",
        "POST /api/marketing/print/upload",
        "GET /api/marketing/cart",
        "POST /api/marketing/cart",
        "POST /api/marketing/cart/checkout",
        "GET /api/marketing/orders",
        "POST /api/marketing/newsletters/subscribe",
        "GET /api/marketing/newsletters/archive",
        "GET /api/marketing/analytics",
      ],
    });
  });

  console.log("✅ [SERVER] All routes registered successfully");
}
