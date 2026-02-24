import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import AnalyticsCard from "@/components/ui/analytics-card";

export default function Finances() {
  const chartRef = useRef<HTMLCanvasElement>(null);

  const { data: analytics } = useQuery({
    queryKey: ['/api/analytics/finances'],
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
              label: 'Portfolio Value (€M)',
              data: [2.1, 2.3, 2.0, 2.4, 2.7, 2.9],
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.3
            }, {
              label: 'Market Index',
              data: [1.8, 2.0, 1.9, 2.1, 2.2, 2.4],
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
                beginAtZero: false,
                ticks: {
                  callback: function(value) {
                    return '€' + value + 'M';
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
        <div className="absolute inset-0 bg-green-600"></div>
        <div className="video-overlay"></div>
        <div className="relative z-10 flex items-center justify-center h-full text-white text-center">
          <div>
            <h1 className="text-4xl font-bold mb-4">Finances Analytics</h1>
            <p className="text-xl">Market trends and financial insights</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Analytics Cards */}
        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <AnalyticsCard
            title="Portfolio Value"
            value="€2.9M"
            change="+12.5% this year"
            trend="up"
            color="green"
          />
          <AnalyticsCard
            title="ROI"
            value="15.2%"
            change="+2.1% vs market"
            trend="up"
            color="blue"
          />
          <AnalyticsCard
            title="Risk Score"
            value="Low"
            color="green"
          />
          <AnalyticsCard
            title="Active Investments"
            value="47"
            change="+5 new positions"
            trend="up"
            color="purple"
          />
        </div>
        
        {/* Charts and Details */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Market Performance</h3>
            <div className="chart-container">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Top Performing Assets</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Tech Stocks ETF</span>
                <span className="font-semibold text-green-600">+18.5%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>European Bonds</span>
                <span className="font-semibold text-green-600">+7.2%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Real Estate Fund</span>
                <span className="font-semibold text-green-600">+12.8%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Commodity Index</span>
                <span className="font-semibold text-red-600">-2.1%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
