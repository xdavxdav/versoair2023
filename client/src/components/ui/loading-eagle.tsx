interface LoadingEagleProps {
  className?: string;
}

export default function LoadingEagle({
  className = "w-24 h-24",
}: LoadingEagleProps) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ perspective: "600px" }}
    >
      <div className="eagle-pierce">
        <img
          src="/33826.svg"
          alt="Loading eagle"
          className="w-full h-full object-contain drop-shadow-2xl"
          style={{ filter: "drop-shadow(0 0 12px rgba(191,131,28,0.5))" }}
          draggable={false}
        />
      </div>
    </div>
  );
}
