import { X } from "lucide-react";
import { Button } from "./button";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

interface LocationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LocationPanel({ isOpen, onClose }: LocationPanelProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);

  const { data: locationData } = useQuery({
    queryKey: ['/api/location/analytics'],
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen && chartRef.current && locationData) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx && window.Chart) {
        new window.Chart(ctx, {
          type: 'radar',
          data: {
            labels: locationData.regions?.map((r: any) => r.name) || ['North', 'East', 'South', 'West', 'Center'],
            datasets: [{
              label: 'Coverage',
              data: locationData.regions?.map((r: any) => r.coverage) || [85, 92, 78, 88, 95],
              borderColor: 'hsl(36, 82%, 43%)',
              backgroundColor: 'hsla(36, 82%, 43%, 0.2)'
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
  }, [isOpen, locationData]);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div className={`slide-panel right fixed top-0 right-0 w-80 h-full bg-white shadow-xl z-40 p-6 ${isOpen ? 'active' : ''}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Location Services</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Current Location</h4>
            <p className="text-sm text-gray-600">{locationData?.currentLocation || "Loading..."}</p>
            <div className="mt-3 h-32">
              <canvas ref={chartRef} className="w-full h-full"></canvas>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">GPS Analytics</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Active Users:</span>
                <span>{locationData?.activeUsers?.toLocaleString() || "0"}</span>
              </div>
              <div className="flex justify-between">
                <span>Coverage Areas:</span>
                <span>{locationData?.coverageAreas || "0"}%</span>
              </div>
              <div className="flex justify-between">
                <span>Response Time:</span>
                <span>{locationData?.responseTime || "0s"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
