import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get(
  "/dashboard-stats",
  asyncHandler(async (req, res) => {
    const { category, businessId } = req.query as {
      category?: string;
      businessId?: string;
    };

    if (businessId) {
      const businessData = await db.execute(
        sql`SELECT id, name, category_id, description, rating, review_count FROM businesses WHERE id = ${businessId} AND is_active = true`,
      );
      const business = businessData.rows[0] as any;
      if (!business) {
        return res.status(404).json({ success: false, error: "Business not found" });
      }

      const categoryData = await db.execute(
        sql`SELECT name FROM business_categories WHERE id = ${business.category_id}`,
      );
      const categoryName = (categoryData.rows[0] as any)?.name || "General";

      return res.json({
        success: true,
        type: "business-specific",
        businessId: business.id,
        businessName: business.name,
        category: categoryName,
        relevantMetrics: getIndustryRelevantMetrics(categoryName),
        mockStats: generateBusinessStats(
          categoryName,
          business.rating || 4,
          business.review_count || 0,
        ),
        timestamp: new Date().toISOString(),
      });
    }

    if (category) {
      const categoryData = await db.execute(
        sql`SELECT id FROM business_categories WHERE name ILIKE ${`${category}%`}`,
      );
      const categoryIds = categoryData.rows.map((row: any) => row.id);

      if (categoryIds.length > 0) {
        const businessCount = await db.execute(
          sql`SELECT COUNT(*) as count FROM businesses WHERE is_active = true AND category_id IN (${categoryIds.join(",")})`,
        );
        const totalBusinesses = parseInt(
          String((businessCount.rows[0] as any)?.count || 0),
          10,
        );

        return res.json({
          success: true,
          type: "category-filtered",
          category,
          totalBusinessesByCategory: totalBusinesses,
          relevantMetrics: getIndustryRelevantMetrics(category),
          timestamp: new Date().toISOString(),
        });
      }
    }

    const [businessCount, categoryCount, jobCount, countryData, countryMapData, topCategories, recentListings] =
      await Promise.all([
        db.execute(sql`SELECT COUNT(*) as count FROM businesses WHERE is_active = true`),
        db.execute(sql`SELECT COUNT(*) as count FROM business_categories`),
        db.execute(sql`SELECT COUNT(*) as count FROM jobs WHERE status = 'active'`),
        db.execute(
          sql`SELECT COUNT(DISTINCT c.id) as count
              FROM countries c
              INNER JOIN businesses b ON b.country_id = c.id AND b.is_active = true`,
        ),
        db.execute(
          sql`SELECT c.name, COUNT(b.id)::int as count
              FROM countries c
              INNER JOIN businesses b ON b.country_id = c.id AND b.is_active = true
              GROUP BY c.id, c.name
              ORDER BY count DESC`,
        ),
        db.execute(sql`
          SELECT bc.name, COUNT(b.id) as count
          FROM business_categories bc
          LEFT JOIN businesses b ON b.category_id = bc.id AND b.is_active = true
          WHERE bc.parent_id IS NOT NULL
          GROUP BY bc.id, bc.name
          ORDER BY count DESC
          LIMIT 10
        `),
        db.execute(sql`
          SELECT id, name, location, created_at
          FROM businesses
          WHERE is_active = true
          ORDER BY created_at DESC
          LIMIT 5
        `),
      ]);

    const totalBusinesses = parseInt(
      String((businessCount.rows[0] as any)?.count || 0),
      10,
    );
    const categoriesCount = parseInt(
      String((categoryCount.rows[0] as any)?.count || 0),
      10,
    );
    const jobListings = parseInt(String((jobCount.rows[0] as any)?.count || 0), 10);
    const countriesCount = parseInt(
      String((countryData.rows[0] as any)?.count || 0),
      10,
    );

    const countryMap: Record<string, number> = {};
    countryMapData.rows.forEach((row: any) => {
      if (row.name) countryMap[row.name] = parseInt(String(row.count || 0), 10);
    });

    const topCats = topCategories.rows.map((row: any) => ({
      name: row.name || "Unknown",
      count: parseInt(String(row.count || 0), 10),
    }));

    const recent = recentListings.rows.map((row: any) => ({
      id: String(row.id),
      name: row.name || "Unknown",
      location: row.location || "N/A",
    }));

    res.json({
      success: true,
      type: "platform-wide",
      totalBusinesses,
      categoriesCount,
      jobListings,
      countriesCount,
      businessesByCountry: countryMap,
      topCategories: topCats,
      recentListings: recent,
      timestamp: new Date().toISOString(),
    });
  }),
);

function getIndustryRelevantMetrics(category: string) {
  const categoryLower = category.toLowerCase();

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
      primary: ["Product Views", "Sales Revenue", "Foot Traffic", "Customer Reviews"],
      secondary: [
        "Inventory Turnover",
        "Average Transaction Value",
        "Product Categories",
      ],
      tertiary: ["Conversion Rate", "Customer Retention", "Peak Shopping Hours"],
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
      primary: ["Room Occupancy Rate", "Reservations", "Guest Reviews", "Average Daily Rate"],
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
      primary: ["Projects Completed", "Active Projects", "Client Reviews", "Safety Record"],
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
      primary: ["Service Appointments", "Test Drive Requests", "Customer Reviews", "Vehicles Sold"],
      secondary: ["Inventory Status", "Average Service Cost", "Repair Completion Time"],
      tertiary: ["Parts Availability", "Warranty Claims", "Customer Retention"],
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

  if (
    categoryLower.includes("finance") ||
    categoryLower.includes("bank") ||
    categoryLower.includes("insurance") ||
    categoryLower.includes("loan") ||
    categoryLower.includes("investment") ||
    categoryLower.includes("microfinance")
  ) {
    return {
      primary: ["Accounts Opened", "Loan Applications", "Assets Under Management", "Client Trust Score"],
      secondary: ["Interest Rates Offered", "Approval Rate", "Average Loan Size"],
      tertiary: ["Customer Lifetime Value", "Regulatory Compliance", "Referral Rate"],
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
      primary: ["Events Hosted", "Attendance/Tickets", "Customer Ratings", "Venue Capacity Used"],
      secondary: ["Ticket Sales Revenue", "Artist/Performer Lineup", "Event Frequency"],
      tertiary: ["Repeat Visitors", "Social Media Reach", "Partnership Opportunities"],
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
      primary: ["Patient Appointments", "Patient Reviews", "Services Offered"],
      secondary: ["Insurance Accepted", "Specialist Credentials", "Treatment Options"],
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
      primary: ["Table Bookings", "Menu Clicks", "Food Orders", "Customer Reviews"],
      secondary: ["Delivery Orders", "Average Order Value", "Peak Hours Traffic"],
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

  if (
    categoryLower.includes("law") ||
    categoryLower.includes("legal") ||
    categoryLower.includes("consultant") ||
    categoryLower.includes("accountant") ||
    categoryLower.includes("auditor")
  ) {
    return {
      primary: ["Client Enquiries", "Cases/Projects", "Client Reviews", "Consultation Rate"],
      secondary: ["Service Specializations", "Success Rate", "Industry Expertise"],
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
      primary: ["Active Members", "Classes/Events", "Member Reviews", "Facilities Utilization"],
      secondary: ["Membership Revenue", "Class Attendance", "Personal Training Sessions"],
      tertiary: ["Member Retention", "Community Engagement", "Coach/Trainer Rating"],
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

function generateBusinessStats(category: string, rating: number, reviewCount: number) {
  const engagementMultiplier = (rating / 5) * (Math.log(reviewCount + 1) / 4 + 1);
  const categoryLower = category.toLowerCase();

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

export default router;
