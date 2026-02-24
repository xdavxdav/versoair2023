import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import AnalyticsCard from "@/components/ui/analytics-card";

export default function Commerce() {
  const chartRef = useRef<HTMLCanvasElement>(null);

  const { data: analytics } = useQuery({
    queryKey: ['/api/analytics/commerce'],
  });

  useEffect(() => {
    if (chartRef.current && window.Chart) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        new window.Chart(ctx, {
          type: 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
              label: 'Sales (€)',
              data: [65000, 78000, 90000, 81000, 96000, 105000],
              borderColor: 'hsl(36, 82%, 43%)',
              backgroundColor: 'hsla(36, 82%, 43%, 0.1)',
              tension: 0.3
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
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return '€' + value.toLocaleString();
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
        <div className="absolute inset-0 bg-blue-600"></div>
        <div className="video-overlay"></div>
        <div className="relative z-10 flex items-center justify-center h-full text-white text-center">
          <div>
            <h1 className="text-4xl font-bold mb-4">Commerce Analytics</h1>
            <p className="text-xl">Sales performance and business metrics</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Analytics Cards */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <AnalyticsCard
            title="Total Sales"
            value="€2.4M"
            change="+15% from last month"
            trend="up"
            color="green"
          />
          <AnalyticsCard
            title="Orders"
            value="8,924"
            change="+8% from last month"
            trend="up"
            color="blue"
          />
          <AnalyticsCard
            title="Conversion Rate"
            value="3.2%"
            change="+0.5% from last month"
            trend="up"
            color="purple"
          />
        </div>
        
        {/* Charts and Details */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Sales Trends</h3>
            <div className="chart-container">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Top Products</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Premium Package</span>
                <span className="font-semibold">€125,400</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Standard Package</span>
                <span className="font-semibold">€89,200</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Basic Package</span>
                <span className="font-semibold">€56,800</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
