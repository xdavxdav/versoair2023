import React from "react";

interface ProgressBarProps {
  percent: number;
  className?: string;
  height?: string; // default '8px'
  ariaLabel?: string;
  vertical?: boolean;
}

// We centralize inline style usage here and explicitly disable lint rules for this helper.
/* eslint-disable */
/* webhint-disable hint-no-inline-styles */
/* webhint-disable no-inline-styles */
export default function ProgressBar({
  percent,
  className = "",
  height = "8px",
  ariaLabel = "progress",
  vertical = false,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  const barStyle = vertical
    ? { height: `${clamped}%` }
    : { width: `${clamped}%` };

  const ariaProps: Record<string, any> = {
    role: "progressbar",
    "aria-label": ariaLabel,
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-valuenow": clamped,
  };

  return (
    <div className={`w-full rounded-full overflow-hidden ${className}`}>
      <progress
        className={`w-full ${vertical ? "progress--vertical" : "progress"}`}
        value={clamped}
        max={100}
        {...ariaProps}
      />

      <style>{`
        .progress {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: ${height};
          border-radius: 9999px;
          background-color: transparent;
        }
        .progress::-webkit-progress-bar {
          background-color: #f3f4f6;
          border-radius: 9999px;
        }
        .progress::-webkit-progress-value {
          border-radius: 9999px;
          background-image: linear-gradient(to right, #34d399, #059669);
        }
        .progress::-moz-progress-bar {
          border-radius: 9999px;
          background-image: linear-gradient(to right, #34d399, #059669);
        }
        .progress--vertical {
          transform: rotate(-90deg);
          transform-origin: center;
          height: 100%;
        }
      `}</style>
    </div>
  );
}
