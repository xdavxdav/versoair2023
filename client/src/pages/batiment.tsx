import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import AnalyticsCard from "@/components/ui/analytics-card";

export default function Batiment() {
  const chartRef = useRef<HTMLCanvasElement>(null);

  const { data: analytics } = useQuery({
    queryKey: ['/api/analytics/batiment'],
  });

  useEffect(() => {
    if (chartRef.current && window.Chart) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        new window.Chart(ctx, {
          type: 'line',
          data: {
            labels: ['Q1', 'Q2', 'Q3', 'Q4'],
            datasets: [{
              label: 'Projects Completed',
              data: [12, 18, 24, 32],
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.3
            }, {
              label: 'Budget Efficiency %',
              data: [85, 88, 91, 95],
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
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
        <div className="absolute inset-0 bg-green-600"></div>
        <div className="video-overlay"></div>
        <div className="relative z-10 flex items-center justify-center h-full text-white text-center">
          <div>
            <h1 className="text-4xl font-bold mb-4">Bâtiment Analytics</h1>
            <p className="text-xl">Construction project insights and performance</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Analytics Cards */}
        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <AnalyticsCard
            title="Active Projects"
            value="32"
            change="+6 from last quarter"
            trend="up"
            color="green"
          />
          <AnalyticsCard
            title="Completion Rate"
            value="95%"
            change="+3% improvement"
            trend="up"
            color="blue"
          />
          <AnalyticsCard
            title="Safety Score"
            value="9.2/10"
            color="green"
          />
          <AnalyticsCard
            title="Cost Efficiency"
            value="€2.1M"
            change="Under budget"
            trend="up"
            color="purple"
          />
        </div>
        
        {/* Charts and Details */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Project Performance</h3>
            <div className="chart-container">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Top Contractors</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>BatiCorp SA</span>
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-500">★★★★★</span>
                  <span className="font-semibold">4.9</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Construct Pro</span>
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-500">★★★★☆</span>
                  <span className="font-semibold">4.7</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Elite Build</span>
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-500">★★★★☆</span>
                  <span className="font-semibold">4.6</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
