import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import AnalyticsCard from "@/components/ui/analytics-card";

export default function Automobile() {
  const chartRef = useRef<HTMLCanvasElement>(null);

  const { data: analytics } = useQuery({
    queryKey: ['/api/analytics/automobile'],
  });

  useEffect(() => {
    if (chartRef.current && window.Chart) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        new window.Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Maintenance', 'Repairs', 'Inspections', 'Parts', 'Other'],
            datasets: [{
              data: [35, 25, 20, 15, 5],
              backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom'
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
        <div className="absolute inset-0 bg-red-600"></div>
        <div className="video-overlay"></div>
        <div className="relative z-10 flex items-center justify-center h-full text-white text-center">
          <div>
            <h1 className="text-4xl font-bold mb-4">Automobile Analytics</h1>
            <p className="text-xl">Service trends and automotive insights</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Analytics Cards */}
        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <AnalyticsCard
            title="Service Orders"
            value="1,247"
            change="+12% this month"
            trend="up"
            color="blue"
          />
          <AnalyticsCard
            title="Customer Rating"
            value="4.8/5"
            change="+0.2 improvement"
            trend="up"
            color="green"
          />
          <AnalyticsCard
            title="Avg Service Time"
            value="2.3h"
            change="-15 min faster"
            trend="up"
            color="orange"
          />
          <AnalyticsCard
            title="Revenue"
            value="€156K"
            change="+18% this month"
            trend="up"
            color="purple"
          />
        </div>
        
        {/* Charts and Details */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Service Distribution</h3>
            <div className="chart-container">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Popular Services</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Oil Change</span>
                <span className="font-semibold">€45 - €65</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Brake Service</span>
                <span className="font-semibold">€120 - €200</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Tire Replacement</span>
                <span className="font-semibold">€80 - €150</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Engine Diagnostic</span>
                <span className="font-semibold">€90 - €140</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
