import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    Chart: any;
  }
}

export function GTMAnalyticsChart() {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  useEffect(() => {
    const loadChart = async () => {
      if (typeof window !== 'undefined' && !window.Chart) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = initializeChart;
        document.head.appendChild(script);
      } else if (window.Chart) {
        initializeChart();
      }
    };

    const initializeChart = () => {
      if (chartRef.current && window.Chart) {
        const ctx = chartRef.current.getContext('2d');
        
        // Destroy existing chart if it exists
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }

        chartInstance.current = new window.Chart(ctx, {
          type: 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [
              {
                label: 'Page Views',
                data: [12500, 19000, 15000, 22000, 18500, 25000, 28000, 32000, 29500, 35000, 38000, 42000],
                borderColor: '#bf831c',
                backgroundColor: 'rgba(191, 131, 28, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#bf831c',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
              },
              {
                label: 'User Sessions',
                data: [8200, 12500, 9800, 14500, 12200, 16800, 19200, 21500, 20100, 24000, 26500, 29800],
                borderColor: '#d4941f',
                backgroundColor: 'rgba(212, 148, 31, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#d4941f',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
              },
              {
                label: 'Goal Conversions',
                data: [1200, 1850, 1450, 2100, 1750, 2400, 2700, 3100, 2850, 3400, 3700, 4100],
                borderColor: '#8b5a0c',
                backgroundColor: 'rgba(139, 90, 12, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#8b5a0c',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'Google Tag Manager Analytics - 2024 Performance',
                font: {
                  size: 18,
                  weight: 'bold'
                },
                color: '#1f2937'
              },
              legend: {
                display: true,
                position: 'top',
                labels: {
                  usePointStyle: true,
                  padding: 20,
                  font: {
                    size: 12
                  }
                }
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: '#bf831c',
                borderWidth: 1,
                cornerRadius: 8,
                callbacks: {
                  label: function(context: any) {
                    return context.dataset.label + ': ' + context.parsed.y.toLocaleString();
                  }
                }
              }
            },
            scales: {
              x: {
                grid: {
                  display: true,
                  color: 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                  font: {
                    size: 11
                  }
                }
              },
              y: {
                beginAtZero: true,
                grid: {
                  display: true,
                  color: 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                  font: {
                    size: 11
                  },
                  callback: function(value: any) {
                    return value.toLocaleString();
                  }
                }
              }
            },
            interaction: {
              mode: 'nearest',
              axis: 'x',
              intersect: false
            },
            elements: {
              line: {
                borderWidth: 3
              }
            }
          }
        });
      }
    };

    loadChart();

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  return (
    <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg shadow-lg border border-gray-200">
      <div className="h-64 sm:h-80 lg:h-96 relative">
        <canvas ref={chartRef}></canvas>
      </div>
      <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
        <div className="p-2 sm:p-3 bg-gradient-to-r from-[#bf831c]/10 to-[#d4941f]/10 rounded-lg">
          <div className="text-xl sm:text-2xl font-bold text-[#bf831c]">42K</div>
          <div className="text-xs sm:text-sm text-gray-600">Monthly Page Views</div>
        </div>
        <div className="p-2 sm:p-3 bg-gradient-to-r from-[#d4941f]/10 to-[#bf831c]/10 rounded-lg">
          <div className="text-xl sm:text-2xl font-bold text-[#d4941f]">29.8K</div>
          <div className="text-xs sm:text-sm text-gray-600">User Sessions</div>
        </div>
        <div className="p-2 sm:p-3 bg-gradient-to-r from-[#8b5a0c]/10 to-[#bf831c]/10 rounded-lg">
          <div className="text-xl sm:text-2xl font-bold text-[#8b5a0c]">4.1K</div>
          <div className="text-xs sm:text-sm text-gray-600">Goal Conversions</div>
        </div>
      </div>
    </div>
  );
}