import { memo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings, RefreshCw, Bell, Eye } from "lucide-react";

interface SettingsPanelProps {
  autoRefresh: boolean;
  onAutoRefreshChange: (enabled: boolean) => void;
  onRefresh: () => void;
}

export const SettingsPanel = memo(
  ({ autoRefresh, onAutoRefreshChange, onRefresh }: SettingsPanelProps) => {
    return (
      <div className="space-y-6">
        {/* General Settings */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-600" />
              General Settings
            </CardTitle>
            <CardDescription>
              Configure dashboard behavior and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Auto-Refresh</div>
                  <div className="text-sm text-gray-600">
                    Automatically refresh dashboard data every 30 seconds
                  </div>
                </div>
                <Button
                  variant={autoRefresh ? "default" : "outline"}
                  size="sm"
                  onClick={() => onAutoRefreshChange(!autoRefresh)}
                >
                  {autoRefresh ? "Enabled" : "Disabled"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">
                    Manual Refresh
                  </div>
                  <div className="text-sm text-gray-600">
                    Click to refresh all dashboard data immediately
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Notifications</div>
                  <div className="text-sm text-gray-600">
                    Receive alerts for important database events
                  </div>
                </div>
                <Button variant="default" size="sm" className="gap-2">
                  <Bell className="h-4 w-4" />
                  Enable
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Data Retention Policy</CardTitle>
            <CardDescription>
              Control how long data is kept before archival
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <label className="font-medium text-gray-900">
                  Archive logs after:
                </label>
                <Select defaultValue="90">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <label className="font-medium text-gray-900">
                  Delete archived data after:
                </label>
                <Select defaultValue="365">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="180">6 months</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                    <SelectItem value="730">2 years</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Info */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Database Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Database Name</span>
                <Badge variant="outline">versoair_business_intelligence</Badge>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Connection Status</span>
                <Badge className="bg-green-100 text-green-800">Connected</Badge>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Total Tables</span>
                <Badge variant="outline">40+</Badge>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Database Version</span>
                <Badge variant="outline">PostgreSQL 14</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  },
);

SettingsPanel.displayName = "SettingsPanel";
