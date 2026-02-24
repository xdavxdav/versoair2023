import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface AnalyticsCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down";
  color?: "green" | "blue" | "purple" | "orange";
}

export default function AnalyticsCard({ title, value, change, trend, color = "blue" }: AnalyticsCardProps) {
  const colorClasses = {
    green: "text-green-600",
    blue: "text-blue-600",
    purple: "text-purple-600",
    orange: "text-orange-600"
  };

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold ${colorClasses[color]}`}>{value}</p>
        {change && (
          <div className={`flex items-center mt-2 text-sm ${colorClasses[color]}`}>
            {trend === "up" ? (
              <TrendingUp className="h-4 w-4 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 mr-1" />
            )}
            {change}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
