import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Alert components inline since no separate alert.tsx exists
const Alert = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`rounded-lg border p-4 ${className}`}>{children}</div>;
const AlertDescription = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`text-sm ${className}`}>{children}</div>;
import { authenticatedFetch } from "@/lib/auth";
import { AlertCircle, CheckCircle, TrendingUp } from "lucide-react";

interface BusinessWithCategory {
  id: string;
  name: string;
  description: string;
  category: string;
  rating: number;
  reviews: number;
}

interface CategoryStats {
  name: string;
  businessCount: number;
  lastUpdated: string;
  suspiciousCount?: number;
}

export default function CategoryAuditDashboard() {
  const [categories, setCategories] = useState<CategoryStats[]>([]);
  const [suspiciousBusinesses, setSuspiciousBusinesses] = useState<
    BusinessWithCategory[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    totalCategories: 0,
    suspiciousCount: 0,
    cleanCount: 0,
    contaminationRate: 0,
  });

  const categoryKeywords: Record<string, string[]> = {
    plumb: ["plumb", "water", "pipe", "drain", "faucet", "sewer"],
    electric: ["electric", "electrician", "wiring", "circuit", "power"],
    telecom: ["telecom", "phone", "mobile", "voip", "call", "communication"],
    beauty: ["beauty", "salon", "hair", "cosmetic", "aesthetic", "styling"],
    health: ["health", "hospital", "clinic", "doctor", "medical", "nursing"],
    restaurant: ["restaurant", "food", "dining", "cuisine", "meal", "chef"],
    retail: ["shop", "store", "retail", "sale", "purchase", "commercial"],
    fitness: ["gym", "fitness", "exercise", "training", "sports", "workout"],
    cloud: ["cloud", "hosting", "server", "data", "infrastructure"],
    school: ["school", "education", "student", "teacher", "learning"],
  };

  useEffect(() => {
    loadAuditData();
  }, []);

  async function loadAuditData() {
    try {
      setLoading(true);

      // Fetch all businesses from correct endpoint
      const bizResponse = await authenticatedFetch(
        "/api/v1/admin/businesses?limit=1000",
      );
      const bizData = await bizResponse.json();
      const businesses: BusinessWithCategory[] = Array.isArray(bizData)
        ? bizData
        : bizData.data || [];

      // Fetch all categories
      const catResponse = await authenticatedFetch("/api/categories");
      const allCategories = await catResponse.json();

      // Analyze for suspicious entries
      const suspicious: BusinessWithCategory[] = [];

      businesses.forEach((biz: BusinessWithCategory) => {
        const isSuspicious = checkDescriptionCategoryMatch(
          biz.description,
          biz.category,
        ).isSuspicious;

        if (isSuspicious) {
          suspicious.push(biz);
        }
      });

      // Group by category
      const categoryMap: Record<string, number> = {};
      businesses.forEach((biz: BusinessWithCategory) => {
        categoryMap[biz.category] = (categoryMap[biz.category] || 0) + 1;
      });

      const categoriesWithStats: CategoryStats[] = Object.entries(
        categoryMap,
      ).map(([name, count]) => ({
        name,
        businessCount: count,
        lastUpdated: new Date().toLocaleDateString(),
      }));

      setCategories(
        categoriesWithStats.sort((a, b) => b.businessCount - a.businessCount),
      );
      setSuspiciousBusinesses(suspicious);

      // Update stats
      const contaminationRate =
        businesses.length > 0
          ? Math.round((suspicious.length / businesses.length) * 100)
          : 0;

      setStats({
        totalBusinesses: businesses.length,
        totalCategories: allCategories.length,
        suspiciousCount: suspicious.length,
        cleanCount: businesses.length - suspicious.length,
        contaminationRate,
      });
    } catch (error) {
      console.error("Error loading audit data:", error);
    } finally {
      setLoading(false);
    }
  }

  function checkDescriptionCategoryMatch(
    description: string,
    categoryName: string,
  ): { isSuspicious: boolean; expectedKeywords: string[] } {
    const desc = description.toLowerCase();
    const cat = categoryName.toLowerCase();

    let matchedKeywords: string[] = [];
    for (const [categoryKey, keywords] of Object.entries(categoryKeywords)) {
      if (cat.includes(categoryKey)) {
        matchedKeywords = keywords;
        break;
      }
    }

    if (matchedKeywords.length === 0) {
      return { isSuspicious: false, expectedKeywords: [] };
    }

    const hasMatch = matchedKeywords.some((kw) => desc.includes(kw));
    return {
      isSuspicious: !hasMatch,
      expectedKeywords: matchedKeywords,
    };
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading audit data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Category Audit Dashboard</h1>
        <p className="text-gray-600">
          Monitor business categorization health and detect contamination
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Businesses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBusinesses}</div>
            <p className="text-xs text-gray-500 mt-1">Across all categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCategories}</div>
            <p className="text-xs text-gray-500 mt-1">Unique categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Clean Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.cleanCount}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {((stats.cleanCount / stats.totalBusinesses) * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className={stats.contaminationRate > 0 ? "border-red-300" : ""}>
          <CardHeader className="pb-2">
            <CardTitle
              className={`text-sm font-medium ${stats.contaminationRate > 0 ? "text-red-600" : "text-green-600"}`}
            >
              Contamination Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${stats.contaminationRate > 0 ? "text-red-600" : "text-green-600"}`}
            >
              {stats.contaminationRate}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.suspiciousCount} suspicious
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Suspicious Entries Alert */}
      {suspiciousBusinesses.length > 0 && (
        <Alert className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <div className="text-red-800 font-semibold">
              ⚠️ {suspiciousBusinesses.length} Suspicious Entries Detected
            </div>
            <p className="text-sm text-red-700 mt-1">
              These businesses may have been miscategorized. Review and take
              corrective action.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Suspicious Businesses List */}
      {suspiciousBusinesses.length > 0 && (
        <Card className="border-red-300">
          <CardHeader>
            <CardTitle className="text-red-700">
              Suspicious Business Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suspiciousBusinesses.map((biz) => {
                const match = checkDescriptionCategoryMatch(
                  biz.description,
                  biz.category,
                );
                return (
                  <div
                    key={biz.id}
                    className="p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-red-900">{biz.name}</p>
                        <p className="text-sm text-red-800 mt-1">
                          {biz.description}
                        </p>
                        <div className="mt-2 text-sm text-red-700">
                          <p>
                            📁 Assigned Category:{" "}
                            <span className="font-semibold">
                              {biz.category}
                            </span>
                          </p>
                          <p className="mt-1">
                            Expected keywords:{" "}
                            {match.expectedKeywords.join(", ")}
                          </p>
                        </div>
                      </div>
                      <div className="ml-4">
                        <span className="px-2 py-1 bg-red-200 text-red-800 text-xs font-semibold rounded">
                          Review
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Category Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categories.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{cat.name}</p>
                  <p className="text-xs text-gray-500">
                    Updated: {cat.lastUpdated}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-48 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${(cat.businessCount / stats.totalBusinesses) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {cat.businessCount}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(
                        (cat.businessCount / stats.totalBusinesses) *
                        100
                      ).toFixed(1)}
                      %
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Check */}
      {suspiciousBusinesses.length === 0 && (
        <Alert className="border-green-300 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <div className="text-green-800 font-semibold">
              ✅ Database Integrity Verified
            </div>
            <p className="text-sm text-green-700 mt-1">
              All businesses are properly categorized. No contamination
              detected.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
