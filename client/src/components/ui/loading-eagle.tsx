import { useEffect, useState } from "react";

interface LoadingEagleProps {
  className?: string;
}

export default function LoadingEagle({
  className = "w-24 h-24",
}: LoadingEagleProps) {
  // Force animation restart on every mount by cycling a key
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, []);

  return (
    <div
      className={`flex flex-col items-center justify-center ${className}`}
      style={{ perspective: "600px" }}
    >
      <div className="eagle-pierce" key={animKey}>
        <div className="eagle-glow-ring" />
        <img
          src="/33826.svg"
          alt="Loading…"
          className="w-full h-full object-contain drop-shadow-2xl relative z-10"
          style={{ filter: "drop-shadow(0 0 16px rgba(191,131,28,0.6))" }}
          draggable={false}
        />
      </div>
      <div className="loading-dots mt-4">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  );
}
