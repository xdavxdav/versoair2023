import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  change?: string | number;
  trend?: "up" | "down";
  color?: string; // allow arbitrary color names used across the app
  icon?: React.ReactNode | React.ComponentType<any>;
}

export default function AnalyticsCard({
  title,
  value,
  change,
  trend,
  color = "blue",
  icon,
}: AnalyticsCardProps) {
  const colorClasses: Record<string, string> = {
    green: "text-green-600",
    blue: "text-blue-600",
    purple: "text-purple-600",
    orange: "text-orange-600",
    teal: "text-teal-600",
    pink: "text-pink-600",
    yellow: "text-yellow-500",
    // fallback
    default: "text-gray-800",
  };

  const selectedColorClass = colorClasses[color] ?? colorClasses.default;

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader className="pb-2 flex items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          {icon && (
            <span className="opacity-90">
              {typeof icon === "function"
                ? React.createElement(icon as React.ComponentType<any>, {
                    className: "h-5 w-5",
                  })
                : icon}
            </span>
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold ${selectedColorClass}`}>{value}</p>
        {change !== undefined && (
          <div
            className={`flex items-center mt-2 text-sm ${selectedColorClass}`}
          >
            {trend === "up" ? (
              <TrendingUp className="h-4 w-4 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 mr-1" />
            )}
            {String(change)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
