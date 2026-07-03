declare global {
  interface Window {
    Chart: any;
  }
}

// Load Chart.js dynamically
export const loadChartJS = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.Chart) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Chart.js'));
    document.head.appendChild(script);
  });
};

// Initialize Chart.js when the app loads
if (typeof window !== 'undefined') {
  loadChartJS().catch(console.error);
}

export const chartColors = {
  primary: 'hsl(36, 82%, 43%)',
  secondary: 'hsl(48, 96%, 89%)',
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  purple: '#8b5cf6',
  orange: '#f59e0b',
};

export const createGradient = (ctx: CanvasRenderingContext2D, color: string) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');
  return gradient;
};
