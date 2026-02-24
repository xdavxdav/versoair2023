import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings, Save, RotateCcw } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// Settings structure for each sector
const SECTOR_SETTINGS: Record<string, Record<string, any>> = {
  commerce: {
    visibility: [
      {
        key: "show_in_search",
        label: "Show in Search Results",
        type: "boolean",
        default: true,
      },
      {
        key: "show_contact_info",
        label: "Display Contact Information",
        type: "boolean",
        default: true,
      },
      {
        key: "show_pricing",
        label: "Display Product Prices",
        type: "boolean",
        default: true,
      },
    ],
    notifications: [
      {
        key: "email_new_inquiries",
        label: "Email on New Inquiries",
        type: "boolean",
        default: true,
      },
      {
        key: "email_low_inventory",
        label: "Alert on Low Inventory",
        type: "boolean",
        default: true,
      },
      {
        key: "sms_urgent_orders",
        label: "SMS Notifications for Urgent Orders",
        type: "boolean",
        default: false,
      },
    ],
    listings: [
      {
        key: "max_products_visible",
        label: "Max Products Visible",
        type: "number",
        default: 20,
      },
      {
        key: "featured_product_highlight",
        label: "Highlight Featured Products",
        type: "boolean",
        default: true,
      },
      {
        key: "show_ratings",
        label: "Display Customer Ratings",
        type: "boolean",
        default: true,
      },
    ],
    promotions: [
      {
        key: "enable_discounts",
        label: "Allow Discount Codes",
        type: "boolean",
        default: true,
      },
      {
        key: "auto_apply_coupons",
        label: "Auto-Apply Eligible Coupons",
        type: "boolean",
        default: false,
      },
      {
        key: "loyalty_program",
        label: "Enable Loyalty Program",
        type: "boolean",
        default: true,
      },
    ],
  },

  hotellerie: {
    availability: [
      {
        key: "show_real_time_availability",
        label: "Show Real-Time Room Availability",
        type: "boolean",
        default: true,
      },
      {
        key: "min_booking_days",
        label: "Minimum Stay (Days)",
        type: "number",
        default: 1,
      },
      {
        key: "advance_booking_days",
        label: "Maximum Advance Booking (Days)",
        type: "number",
        default: 365,
      },
    ],
    pricing: [
      {
        key: "display_price_currency",
        label: "Display Currency",
        type: "select",
        options: ["USD", "EUR", "GBP", "CAD"],
        default: "USD",
      },
      {
        key: "show_taxes_included",
        label: "Include Taxes in Price Display",
        type: "boolean",
        default: true,
      },
      {
        key: "dynamic_pricing",
        label: "Enable Dynamic Pricing",
        type: "boolean",
        default: true,
      },
    ],
    notifications: [
      {
        key: "email_new_bookings",
        label: "Email on New Bookings",
        type: "boolean",
        default: true,
      },
      {
        key: "sms_check_in_reminders",
        label: "Send Check-In Reminders",
        type: "boolean",
        default: true,
      },
      {
        key: "email_cancellations",
        label: "Email on Cancellations",
        type: "boolean",
        default: true,
      },
    ],
    guest_experience: [
      {
        key: "show_amenities",
        label: "Display Room Amenities",
        type: "boolean",
        default: true,
      },
      {
        key: "show_photos",
        label: "Display Room Photos",
        type: "boolean",
        default: true,
      },
      {
        key: "instant_confirmation",
        label: "Auto-Confirm Bookings",
        type: "boolean",
        default: true,
      },
    ],
  },

  batiment: {
    visibility: [
      {
        key: "show_portfolio",
        label: "Display Completed Projects",
        type: "boolean",
        default: true,
      },
      {
        key: "show_pricing",
        label: "Display Service Pricing",
        type: "boolean",
        default: true,
      },
      {
        key: "show_certifications",
        label: "Show Licenses & Certifications",
        type: "boolean",
        default: true,
      },
    ],
    bids: [
      {
        key: "accept_job_bids",
        label: "Allow Job Bid Requests",
        type: "boolean",
        default: true,
      },
      {
        key: "auto_estimate_available",
        label: "Offer Instant Estimates",
        type: "boolean",
        default: false,
      },
      {
        key: "bid_response_time_hours",
        label: "Bid Response Time (Hours)",
        type: "number",
        default: 24,
      },
    ],
    notifications: [
      {
        key: "email_new_requests",
        label: "Email on Service Requests",
        type: "boolean",
        default: true,
      },
      {
        key: "email_project_updates",
        label: "Email on Project Updates",
        type: "boolean",
        default: true,
      },
      {
        key: "sms_urgent_requests",
        label: "SMS for Urgent Jobs",
        type: "boolean",
        default: false,
      },
    ],
    scheduling: [
      {
        key: "show_availability_calendar",
        label: "Display Availability Calendar",
        type: "boolean",
        default: true,
      },
      {
        key: "allow_online_booking",
        label: "Enable Online Booking",
        type: "boolean",
        default: true,
      },
      {
        key: "min_notice_hours",
        label: "Minimum Notice (Hours)",
        type: "number",
        default: 24,
      },
    ],
  },

  automobile: {
    listings: [
      {
        key: "show_price",
        label: "Display Vehicle Prices",
        type: "boolean",
        default: true,
      },
      {
        key: "show_mileage",
        label: "Show Mileage & Condition",
        type: "boolean",
        default: true,
      },
      {
        key: "show_inspection_reports",
        label: "Display Inspection Reports",
        type: "boolean",
        default: true,
      },
    ],
    notifications: [
      {
        key: "email_new_inquiries",
        label: "Email on New Inquiries",
        type: "boolean",
        default: true,
      },
      {
        key: "email_price_changes",
        label: "Alert on Price Changes",
        type: "boolean",
        default: false,
      },
      {
        key: "email_similar_listings",
        label: "Suggest Similar Vehicles",
        type: "boolean",
        default: true,
      },
    ],
    inventory: [
      {
        key: "show_inventory_count",
        label: "Display Stock Levels",
        type: "boolean",
        default: false,
      },
      {
        key: "auto_delist_sold",
        label: "Auto-Remove Sold Items",
        type: "boolean",
        default: true,
      },
      {
        key: "list_upcoming_stock",
        label: "Show Coming Soon Items",
        type: "boolean",
        default: true,
      },
    ],
  },

  finances: {
    account_visibility: [
      {
        key: "show_account_balances",
        label: "Display Account Balances",
        type: "boolean",
        default: false,
      },
      {
        key: "show_transaction_history",
        label: "Show Transaction History",
        type: "boolean",
        default: false,
      },
      {
        key: "public_profile",
        label: "Make Profile Public",
        type: "boolean",
        default: false,
      },
    ],
    alerts: [
      {
        key: "alert_low_balance",
        label: "Alert on Low Balance",
        type: "boolean",
        default: true,
      },
      {
        key: "alert_large_transactions",
        label: "Alert on Large Transfers",
        type: "boolean",
        default: true,
      },
      {
        key: "alert_threshold_amount",
        label: "Alert Threshold ($)",
        type: "number",
        default: 5000,
      },
    ],
    notifications: [
      {
        key: "email_statements",
        label: "Email Monthly Statements",
        type: "boolean",
        default: true,
      },
      {
        key: "sms_fraud_alerts",
        label: "SMS Fraud Alerts",
        type: "boolean",
        default: true,
      },
      {
        key: "email_rate_changes",
        label: "Email on Rate Changes",
        type: "boolean",
        default: true,
      },
    ],
    security: [
      {
        key: "require_2fa",
        label: "Require Two-Factor Authentication",
        type: "boolean",
        default: false,
      },
      {
        key: "auto_logout_minutes",
        label: "Auto-Logout Time (Minutes)",
        type: "number",
        default: 15,
      },
      {
        key: "login_notifications",
        label: "Notify on Login Attempts",
        type: "boolean",
        default: true,
      },
    ],
  },

  careers: {
    visibility: [
      {
        key: "show_salary_range",
        label: "Display Salary Range",
        type: "boolean",
        default: false,
      },
      {
        key: "show_job_type",
        label: "Show Job Type",
        type: "boolean",
        default: true,
      },
      {
        key: "show_remote_option",
        label: "Display Remote Availability",
        type: "boolean",
        default: true,
      },
    ],
    applications: [
      {
        key: "allow_direct_apply",
        label: "Allow Direct Apply",
        type: "boolean",
        default: true,
      },
      {
        key: "require_cover_letter",
        label: "Require Cover Letter",
        type: "boolean",
        default: false,
      },
      {
        key: "auto_acknowledge_applications",
        label: "Auto-Acknowledge Applications",
        type: "boolean",
        default: true,
      },
    ],
    notifications: [
      {
        key: "email_new_applications",
        label: "Email on New Applications",
        type: "boolean",
        default: true,
      },
      {
        key: "email_job_matches",
        label: "Suggest Matching Jobs",
        type: "boolean",
        default: true,
      },
      {
        key: "sms_application_status",
        label: "SMS Application Updates",
        type: "boolean",
        default: false,
      },
    ],
    preferences: [
      {
        key: "show_saved_jobs",
        label: "Display Saved Jobs",
        type: "boolean",
        default: true,
      },
      {
        key: "enable_job_alerts",
        label: "Enable Job Alerts",
        type: "boolean",
        default: true,
      },
      {
        key: "alert_new_matching_jobs",
        label: "Auto-Notify of Job Matches",
        type: "boolean",
        default: true,
      },
    ],
  },

  music: {
    profile: [
      {
        key: "public_profile",
        label: "Make Profile Public",
        type: "boolean",
        default: true,
      },
      {
        key: "show_social_links",
        label: "Display Social Media Links",
        type: "boolean",
        default: true,
      },
      {
        key: "show_biography",
        label: "Display Artist Biography",
        type: "boolean",
        default: true,
      },
    ],
    tracks: [
      {
        key: "show_play_count",
        label: "Display Stream Numbers",
        type: "boolean",
        default: true,
      },
      {
        key: "show_downloads",
        label: "Display Download Stats",
        type: "boolean",
        default: false,
      },
      {
        key: "show_licensing_info",
        label: "Display Licensing Info",
        type: "boolean",
        default: true,
      },
    ],
    notifications: [
      {
        key: "email_new_followers",
        label: "Notify on New Followers",
        type: "boolean",
        default: true,
      },
      {
        key: "email_playlist_additions",
        label: "Notify on Playlist Additions",
        type: "boolean",
        default: true,
      },
      {
        key: "email_monthly_stats",
        label: "Email Monthly Analytics",
        type: "boolean",
        default: true,
      },
    ],
    monetization: [
      {
        key: "enable_downloads",
        label: "Allow Paid Downloads",
        type: "boolean",
        default: true,
      },
      {
        key: "enable_licensing",
        label: "Allow Track Licensing",
        type: "boolean",
        default: true,
      },
      {
        key: "payment_frequency",
        label: "Payout Schedule",
        type: "select",
        options: ["weekly", "bi-weekly", "monthly", "quarterly"],
        default: "monthly",
      },
    ],
  },

  realestate: {
    property: [
      {
        key: "show_asking_price",
        label: "Display Asking Price",
        type: "boolean",
        default: true,
      },
      {
        key: "show_property_history",
        label: "Show Property History",
        type: "boolean",
        default: false,
      },
      {
        key: "show_tax_info",
        label: "Display Property Taxes",
        type: "boolean",
        default: false,
      },
    ],
    listings: [
      {
        key: "show_floor_plan",
        label: "Display Floor Plan",
        type: "boolean",
        default: true,
      },
      {
        key: "show_photos",
        label: "Display Property Photos",
        type: "boolean",
        default: true,
      },
      {
        key: "photo_count",
        label: "Number of Photos",
        type: "number",
        default: 10,
      },
    ],
    notifications: [
      {
        key: "email_new_inquiries",
        label: "Email on Property Inquiries",
        type: "boolean",
        default: true,
      },
      {
        key: "email_price_changes",
        label: "Alert on Price Reductions",
        type: "boolean",
        default: true,
      },
      {
        key: "sms_showing_requests",
        label: "SMS for Showing Requests",
        type: "boolean",
        default: false,
      },
    ],
    availability: [
      {
        key: "show_availability_calendar",
        label: "Display Availability Calendar",
        type: "boolean",
        default: true,
      },
      {
        key: "instant_scheduling",
        label: "Allow Instant Showings",
        type: "boolean",
        default: true,
      },
      {
        key: "min_notice_hours",
        label: "Minimum Notice (Hours)",
        type: "number",
        default: 24,
      },
    ],
  },

  annuaire: {
    business_info: [
      {
        key: "show_contact_info",
        label: "Display Contact Information",
        type: "boolean",
        default: true,
      },
      {
        key: "show_hours",
        label: "Display Business Hours",
        type: "boolean",
        default: true,
      },
      {
        key: "show_location",
        label: "Display Location",
        type: "boolean",
        default: true,
      },
    ],
    listings: [
      {
        key: "featured_listing",
        label: "Featured Listing",
        type: "boolean",
        default: false,
      },
      {
        key: "show_reviews",
        label: "Display Customer Reviews",
        type: "boolean",
        default: true,
      },
      {
        key: "show_ratings",
        label: "Display Ratings",
        type: "boolean",
        default: true,
      },
    ],
    notifications: [
      {
        key: "email_reviews",
        label: "Email on New Reviews",
        type: "boolean",
        default: true,
      },
      {
        key: "email_messages",
        label: "Email on New Messages",
        type: "boolean",
        default: true,
      },
      {
        key: "sms_urgent_messages",
        label: "SMS for Urgent Messages",
        type: "boolean",
        default: false,
      },
    ],
  },
};

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sector: keyof typeof SECTOR_SETTINGS;
}

export function SettingsModal({
  open,
  onOpenChange,
  sector,
}: SettingsModalProps) {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current settings
  const { data: currentSettings } = useQuery({
    queryKey: ["settings", sector],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/settings/${sector}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token") || localStorage.getItem("authToken")}`,
        },
      });
      if (!response.ok) return {};
      const data = await response.json();
      return data.settings || {};
    },
    enabled: open,
  });

  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/${sector}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        onOpenChange(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    // Reset to defaults
    const defaults: Record<string, any> = {};
    Object.values(SECTOR_SETTINGS[sector] || {}).forEach(
      (categorySettings: any) => {
        categorySettings.forEach((setting: any) => {
          defaults[setting.key] = setting.default;
        });
      },
    );
    setSettings(defaults);
  };

  const sectorSettings = SECTOR_SETTINGS[sector] || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {sector.charAt(0).toUpperCase() + sector.slice(1)} Settings
          </DialogTitle>
          <DialogDescription>
            Customize your {sector} sector settings and preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={Object.keys(sectorSettings)[0]} className="w-full">
          <TabsList className="grid w-full grid-cols-4 gap-1 overflow-x-auto">
            {Object.keys(sectorSettings).map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className="capitalize text-xs"
              >
                {category.replace(/_/g, " ")}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(sectorSettings).map(
            ([category, categorySettings]) => (
              <TabsContent
                key={category}
                value={category}
                className="space-y-4"
              >
                {(categorySettings as any).map((setting: any) => (
                  <Card key={setting.key}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <Label className="text-base font-medium">
                            {setting.label}
                          </Label>
                        </div>

                        {setting.type === "boolean" && (
                          <Switch
                            checked={settings[setting.key] ?? setting.default}
                            onCheckedChange={(value) =>
                              handleSettingChange(setting.key, value)
                            }
                          />
                        )}

                        {setting.type === "number" && (
                          <Input
                            type="number"
                            value={settings[setting.key] ?? setting.default}
                            onChange={(e) =>
                              handleSettingChange(
                                setting.key,
                                Number(e.target.value),
                              )
                            }
                            className="w-24"
                          />
                        )}

                        {setting.type === "select" && (
                          <Select
                            value={settings[setting.key] ?? setting.default}
                            onValueChange={(value) =>
                              handleSettingChange(setting.key, value)
                            }
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {setting.options?.map((option: string) => (
                                <SelectItem key={option} value={option}>
                                  {option.charAt(0).toUpperCase() +
                                    option.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            ),
          )}
        </Tabs>

        <div className="flex justify-between gap-2 pt-4">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
