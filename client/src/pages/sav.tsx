import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import AnalyticsCard from "@/components/ui/analytics-card";

export default function SAV() {
  const chartRef = useRef<HTMLCanvasElement>(null);

  const { data: analytics } = useQuery({
    queryKey: ['/api/analytics/sav'],
  });

  useEffect(() => {
    if (chartRef.current && window.Chart) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        new window.Chart(ctx, {
          type: 'line',
          data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
              label: 'Tickets Opened',
              data: [45, 52, 48, 61, 55, 38, 25],
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.3
            }, {
              label: 'Tickets Resolved',
              data: [42, 48, 46, 58, 52, 36, 24],
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
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
        <div className="absolute inset-0 bg-blue-600"></div>
        <div className="video-overlay"></div>
        <div className="relative z-10 flex items-center justify-center h-full text-white text-center">
          <div>
            <h1 className="text-4xl font-bold mb-4">SAV 24/7 Analytics</h1>
            <p className="text-xl">Customer support metrics and performance</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Analytics Cards */}
        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <AnalyticsCard
            title="Response Time"
            value="1.2 min"
            change="-30s improvement"
            trend="up"
            color="green"
          />
          <AnalyticsCard
            title="Resolution Rate"
            value="96%"
            change="+2% this week"
            trend="up"
            color="blue"
          />
          <AnalyticsCard
            title="Customer Satisfaction"
            value="4.8/5"
            change="+0.1 improvement"
            trend="up"
            color="purple"
          />
          <AnalyticsCard
            title="Active Tickets"
            value="23"
            change="-12 from yesterday"
            trend="up"
            color="orange"
          />
        </div>
        
        {/* Charts and Details */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Support Ticket Trends</h3>
            <div className="chart-container">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Common Issues</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Login Problems</span>
                <span className="font-semibold">32%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Payment Issues</span>
                <span className="font-semibold">24%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Technical Support</span>
                <span className="font-semibold">18%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>General Inquiries</span>
                <span className="font-semibold">26%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
