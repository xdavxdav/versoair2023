import { X } from "lucide-react";
import { Button } from "./button";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

interface MusicPortalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MusicPortal({ isOpen, onClose }: MusicPortalProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);

  const { data: artists } = useQuery({
    queryKey: ['/api/music/artists'],
    enabled: isOpen,
  });

  const { data: analytics } = useQuery({
    queryKey: ['/api/music/analytics'],
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen && chartRef.current && analytics) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx && window.Chart) {
        new window.Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Pop', 'Rock', 'Electronic', 'Jazz', 'Classical'],
            datasets: [{
              data: [35, 25, 20, 12, 8],
              backgroundColor: ['#ff6b9d', '#c44569', '#6c5ce7', '#a29bfe', '#fd79a8']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: {
                  color: 'white'
                }
              }
            }
          }
        });
      }
    }
  }, [isOpen, analytics]);

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
      <div className={`slide-panel fixed top-0 left-0 w-96 h-full bg-gradient-to-b from-purple-900 to-pink-900 shadow-xl z-40 p-6 text-white ${isOpen ? 'active' : ''}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Verso Air Musical Label</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-purple-200 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white bg-opacity-10 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Top Artists</h4>
            <div className="space-y-2">
              {artists?.slice(0, 2).map((artist: any, index: number) => (
                <div key={artist.id} className="flex items-center space-x-3">
                  <img 
                    src={artist.imageUrl || `https://images.unsplash.com/photo-${index === 0 ? '1493225457124-a3eb161ffa5f' : '1534528741775-53994a69daeb'}?w=40&h=40&fit=crop&crop=face`}
                    alt={artist.name} 
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-medium">{artist.name}</p>
                    <p className="text-sm text-purple-200">{artist.totalStreams?.toLocaleString() || '0'} streams</p>
                  </div>
                </div>
              )) || (
                <>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500"></div>
                    <div>
                      <p className="font-medium">Loading artists...</p>
                      <p className="text-sm text-purple-200">Please wait</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="bg-white bg-opacity-10 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Music Analytics</h4>
            <div className="h-48">
              <canvas ref={chartRef} className="w-full h-full"></canvas>
            </div>
          </div>
          
          <div className="bg-white bg-opacity-10 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Industry Insights</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Streams:</span>
                <span>47.2M</span>
              </div>
              <div className="flex justify-between">
                <span>Monthly Growth:</span>
                <span>+23%</span>
              </div>
              <div className="flex justify-between">
                <span>Active Artists:</span>
                <span>{artists?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
