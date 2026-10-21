import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CreditCard,
  Home,
  Loader2,
  LogOut,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Link } from "wouter";
import { authenticatedFetch } from "@/lib/auth";
import { useAuthContext } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { z } from "zod";

const subscriberBusinessSchema = z.object({
  id: z.number(),
  name: z.string(),
  category_name: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  city_name: z.string().nullable().optional(),
  country_code: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().nullable().optional(),
  is_verified: z.boolean().nullable().optional(),
});

type SubscriberBusiness = z.infer<typeof subscriberBusinessSchema>;

interface GeoAdminSubscriberViewProps {
  userId: number | string;
  username: string;
  tierName: string;
  isFree: boolean;
  showNavigation?: boolean;
}

export default function GeoAdminSubscriberView({
  userId,
  username,
  tierName,
  isFree,
  showNavigation = true,
}: GeoAdminSubscriberViewProps) {
  const { logout } = useAuthContext();
  const numericUserId =
    typeof userId === "number"
      ? userId
      : /^\d+$/.test(userId)
        ? Number(userId)
        : Number.NaN;
  const { data: businesses = [], isLoading, error } = useQuery({
    queryKey: ["geo-admin-subscriber-businesses", numericUserId],
    queryFn: async () => {
      const params = new URLSearchParams({
        ownerId: String(numericUserId),
        limit: "100",
      });
      const response = await authenticatedFetch(`/api/businesses?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Could not load your business listings.",
        );
      }
      if (!Array.isArray(data.data)) {
        throw new Error("The business listings response was invalid.");
      }
      return z.array(subscriberBusinessSchema).parse(data.data);
    },
    enabled: Number.isSafeInteger(numericUserId) && numericUserId > 0,
  });

  return (
    <>
      {showNavigation && (
        <nav
          aria-label="Account navigation"
          className="border-b border-slate-200 bg-white"
        >
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link
              href="/businesses-directory"
              className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
            >
              <Building2 className="h-4 w-4" />
              Business directory
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
            >
              <CreditCard className="h-4 w-4" />
              Plans
            </Link>
            <Link
              href="/profile"
              className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
            >
              <UserRound className="h-4 w-4" />
              My account
            </Link>
            <Button
              type="button"
              variant="ghost"
              className="ml-auto text-slate-700"
              onClick={() => void logout()}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </nav>
      )}
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-2 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-semibold">
                  {isFree
                    ? "Free account · Basic access"
                    : "Subscriber · Read-only"}
                </span>
              </div>
              <CardTitle className="text-2xl text-slate-900">
                Your GeoAdmin overview
              </CardTitle>
              <CardDescription className="mt-2 max-w-2xl text-slate-600">
                Welcome, {username}. This view only includes business listings
                linked to your account. GeoAdmin staff tools and other
                customers’ information are not included.
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="border-emerald-200 text-emerald-800"
            >
              {tierName} plan
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-5 flex items-center gap-2 text-sm text-slate-600">
            <Building2 className="h-4 w-4" />
            <span>Your business listings</span>
            {!isLoading && !error && (
              <Badge variant="secondary">{businesses.length}</Badge>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your account data…
            </div>
          ) : error ? (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
            >
              {error.message}
            </p>
          ) : businesses.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              No business listings are linked to this account yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
              {businesses.map((business) => {
                const location =
                  business.location ||
                  [business.city_name, business.country_code]
                    .filter(Boolean)
                    .join(", ");
                return (
                  <li key={business.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-slate-900">
                          {business.name}
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                          {[business.category_name, location]
                            .filter(Boolean)
                            .join(" · ") || "Business listing"}
                        </p>
                        {!isFree && business.description && (
                          <p className="mt-2 text-sm text-slate-600">
                            {business.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!isFree && (
                          <Badge variant="outline">
                            {business.is_active ? "Active" : "Inactive"}
                          </Badge>
                        )}
                        {!isFree && business.is_verified && (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                    {location && (
                      <p className="mt-3 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {location}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      </main>
    </>
  );
}
