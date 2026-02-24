import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import AnalyticsCard from "@/components/ui/analytics-card";

export default function VersoAI() {
  const chartRef = useRef<HTMLCanvasElement>(null);

  const { data: analytics } = useQuery({
    queryKey: ['/api/analytics/versoai'],
  });

  useEffect(() => {
    if (chartRef.current && window.Chart) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        new window.Chart(ctx, {
          type: 'radar',
          data: {
            labels: ['Accuracy', 'Speed', 'Learning Rate', 'User Satisfaction', 'Efficiency'],
            datasets: [{
              label: 'VersoAI Performance',
              data: [95, 88, 92, 89, 94],
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.2)'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              r: {
                beginAtZero: true,
                max: 100
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
            <h1 className="text-4xl font-bold mb-4">VersoAI Analytics</h1>
            <p className="text-xl">AI performance metrics and usage insights</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Analytics Cards */}
        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <AnalyticsCard
            title="AI Queries"
            value="45.2K"
            change="+32% this month"
            trend="up"
            color="purple"
          />
          <AnalyticsCard
            title="Accuracy Rate"
            value="95.4%"
            change="+1.2% improvement"
            trend="up"
            color="green"
          />
          <AnalyticsCard
            title="Avg Response Time"
            value="0.8s"
            change="-0.2s faster"
            trend="up"
            color="blue"
          />
          <AnalyticsCard
            title="User Satisfaction"
            value="4.6/5"
            change="+0.3 improvement"
            trend="up"
            color="orange"
          />
        </div>
        
        {/* Charts and Details */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">AI Performance Metrics</h3>
            <div className="chart-container">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Popular AI Features</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Text Analysis</span>
                <span className="font-semibold">15.2K uses</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Data Prediction</span>
                <span className="font-semibold">12.8K uses</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Image Recognition</span>
                <span className="font-semibold">9.5K uses</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Natural Language</span>
                <span className="font-semibold">7.7K uses</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
