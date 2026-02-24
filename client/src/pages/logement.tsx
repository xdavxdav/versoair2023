import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import AnalyticsCard from "@/components/ui/analytics-card";

export default function Logement() {
  const chartRef = useRef<HTMLCanvasElement>(null);

  const { data: analytics } = useQuery({
    queryKey: ['/api/analytics/logement'],
  });

  useEffect(() => {
    if (chartRef.current && window.Chart) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        new window.Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Studio', '1BR', '2BR', '3BR', '4BR+'],
            datasets: [{
              label: 'Average Rent (€)',
              data: [850, 1200, 1650, 2100, 2800],
              backgroundColor: '#10b981'
            }, {
              label: 'Availability %',
              data: [15, 25, 35, 45, 55],
              backgroundColor: '#3b82f6'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true
              }
            },
            scales: {
              y: {
                beginAtZero: true
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
        <div className="absolute inset-0 bg-teal-600"></div>
        <div className="video-overlay"></div>
        <div className="relative z-10 flex items-center justify-center h-full text-white text-center">
          <div>
            <h1 className="text-4xl font-bold mb-4">Logement Analytics</h1>
            <p className="text-xl">Housing market trends and rental insights</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Analytics Cards */}
        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <AnalyticsCard
            title="Average Rent"
            value="€1,450"
            change="+3.2% from last year"
            trend="up"
            color="green"
          />
          <AnalyticsCard
            title="Occupancy Rate"
            value="92%"
            change="+2% improvement"
            trend="up"
            color="blue"
          />
          <AnalyticsCard
            title="Available Units"
            value="147"
            change="-23 from last month"
            color="orange"
          />
          <AnalyticsCard
            title="Avg Time to Rent"
            value="12 days"
            change="-3 days faster"
            trend="up"
            color="purple"
          />
        </div>
        
        {/* Charts and Details */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Rental Market Overview</h3>
            <div className="chart-container">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Popular Neighborhoods</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Marais District</span>
                <span className="font-semibold">€2,100/month</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Latin Quarter</span>
                <span className="font-semibold">€1,850/month</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Montmartre</span>
                <span className="font-semibold">€1,650/month</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Belleville</span>
                <span className="font-semibold">€1,200/month</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
