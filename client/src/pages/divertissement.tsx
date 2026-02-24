import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import AnalyticsCard from "@/components/ui/analytics-card";

export default function Divertissement() {
  const chartRef = useRef<HTMLCanvasElement>(null);

  const { data: analytics } = useQuery({
    queryKey: ['/api/analytics/divertissement'],
  });

  useEffect(() => {
    if (chartRef.current && window.Chart) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        new window.Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Concerts', 'Theatre', 'Sports', 'Cinema', 'Festivals'],
            datasets: [{
              label: 'Attendance',
              data: [12500, 8900, 15200, 22100, 9800],
              backgroundColor: ['#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6', '#10b981']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return value.toLocaleString();
                  }
                }
              }
            }
          }
        });
      }
    }
  }, [analytics]);

  return (
    <div>
      {/* Hero Section */}
      <div className="video-container h-64 relative">
        <div className="absolute inset-0 bg-purple-600"></div>
        <div className="video-overlay"></div>
        <div className="relative z-10 flex items-center justify-center h-full text-white text-center">
          <div>
            <h1 className="text-4xl font-bold mb-4">Divertissement Analytics</h1>
            <p className="text-xl">Entertainment events and audience insights</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Analytics Cards */}
        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <AnalyticsCard
            title="Total Attendance"
            value="68.5K"
            change="+22% this month"
            trend="up"
            color="purple"
          />
          <AnalyticsCard
            title="Event Rating"
            value="4.6/5"
            change="+0.3 improvement"
            trend="up"
            color="green"
          />
          <AnalyticsCard
            title="Venue Capacity"
            value="89%"
            change="Average utilization"
            color="orange"
          />
          <AnalyticsCard
            title="Revenue"
            value="€1.2M"
            change="+28% this month"
            trend="up"
            color="blue"
          />
        </div>
        
        {/* Charts and Details */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Event Categories</h3>
            <div className="chart-container">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Upcoming Events</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Summer Music Festival</p>
                  <p className="text-sm text-gray-600">July 25-27, 2024</p>
                </div>
                <span className="font-semibold text-green-600">85% sold</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Shakespeare in the Park</p>
                  <p className="text-sm text-gray-600">August 5, 2024</p>
                </div>
                <span className="font-semibold text-blue-600">92% sold</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Jazz Night</p>
                  <p className="text-sm text-gray-600">August 12, 2024</p>
                </div>
                <span className="font-semibold text-orange-600">67% sold</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
