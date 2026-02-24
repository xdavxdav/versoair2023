import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import AnalyticsCard from "@/components/ui/analytics-card";

export default function Reservations() {
  const chartRef = useRef<HTMLCanvasElement>(null);

  const { data: reservations } = useQuery({
    queryKey: ['/api/reservations'],
  });

  useEffect(() => {
    if (chartRef.current && window.Chart) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        new window.Chart(ctx, {
          type: 'line',
          data: {
            labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
            datasets: [{
              label: 'Bookings',
              data: [12, 8, 25, 45, 38, 52],
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.3
            }, {
              label: 'Cancellations',
              data: [2, 1, 3, 5, 4, 6],
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
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
  }, [reservations]);

  return (
    <div>
      {/* Hero Section */}
      <div className="video-container h-64 relative">
        <div className="absolute inset-0 bg-indigo-600"></div>
        <div className="video-overlay"></div>
        <div className="relative z-10 flex items-center justify-center h-full text-white text-center">
          <div>
            <h1 className="text-4xl font-bold mb-4">Reservations Analytics</h1>
            <p className="text-xl">Booking trends and reservation insights</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Analytics Cards */}
        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <AnalyticsCard
            title="Total Bookings"
            value="2,847"
            change="+15% this week"
            trend="up"
            color="blue"
          />
          <AnalyticsCard
            title="Peak Hours"
            value="6-8 PM"
            color="orange"
          />
          <AnalyticsCard
            title="Cancellation Rate"
            value="8.2%"
            change="-2.1% improvement"
            trend="up"
            color="green"
          />
          <AnalyticsCard
            title="Avg Booking Value"
            value="€87"
            change="+€12 increase"
            trend="up"
            color="purple"
          />
        </div>
        
        {/* Charts and Details */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Booking Patterns</h3>
            <div className="chart-container">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Recent Reservations</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Table for 4</p>
                  <p className="text-sm text-gray-600">Restaurant Le Petit</p>
                </div>
                <span className="text-green-600 font-semibold">Confirmed</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Conference Room A</p>
                  <p className="text-sm text-gray-600">Business Center</p>
                </div>
                <span className="text-blue-600 font-semibold">Pending</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Spa Treatment</p>
                  <p className="text-sm text-gray-600">Wellness Center</p>
                </div>
                <span className="text-green-600 font-semibold">Confirmed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
