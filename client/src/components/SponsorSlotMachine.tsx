"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
interface SponsorSlotMachineProps {
  words?: string[];
  duration?: number;
  cycleDelay?: number;
}
const SponsorSlotMachine: React.FC<SponsorSlotMachineProps> = ({
  words = ["Platinum", "Ambassador", "Supporter", "Friend", "Community"],
  duration = 2,
  cycleDelay = 8,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  useEffect(() => {
    if (!containerRef.current || !scrollerRef.current) return;
    // Clear previous content to prevent stacking duplicates on re-render
    scrollerRef.current.innerHTML = "";
    const allWords = [...words, ...words];
    scrollerRef.current.innerHTML = allWords
      .map((word) => `<div class="slot-item">${word}</div>`)
      .join("");
    const itemHeight = 64;
    const totalHeight = itemHeight * words.length;
    const tl = gsap.timeline({ repeat: -1 });
    tl.to(
      scrollerRef.current,
      {
        y: -totalHeight,
        duration: duration,
        ease: "power2.inOut",
      },
      0,
    )
      .to(
        scrollerRef.current,
        {
          y: -totalHeight + 5,
          duration: 0.1,
          ease: "back.out",
        },
        duration - 0.1,
      )
      .to({}, { duration: cycleDelay - duration }, duration);
    timelineRef.current = tl;
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, [words, duration, cycleDelay]);
  return (
    <div className="d-flex align-items-center justify-content-center my-4">
      <style>{`
        .sponsor-slot-machine {
          perspective: 1000px;
        }
        .slot-container {
          width: 280px;
          height: 64px;
          overflow: hidden;
          border-radius: 12px;
          background: linear-gradient(135deg, #bf831c 0%, #d4941f 100%);
          box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.3), 0 8px 32px rgba(191, 131, 28, 0.3);
          border: 2px solid rgba(212, 148, 31, 0.6);
          position: relative;
        }
        .slot-container::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0.3), transparent 30%, transparent 70%, rgba(0, 0, 0, 0.2)), linear-gradient(90deg, rgba(0, 0, 0, 0.1) 0%, transparent 50%, rgba(0, 0, 0, 0.1) 100%);
          border-radius: 10px;
          pointer-events: none;
          z-index: 2;
        }
        .slot-scroller {
          transform: translateY(0);
          will-change: transform;
        }
        .slot-item {
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 28px;
          color: #ffffff;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 8px rgba(255, 255, 255, 0.2);
          letter-spacing: 0.5px;
        }
        .slot-container .slot-item:nth-child(1) {
          filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.6));
        }
        @media (prefers-reduced-motion: no-preference) {
          .slot-container {
            transform: rotateX(5deg);
            transform-style: preserve-3d;
          }
        }
        @media (max-width: 768px) {
          .slot-container { width: 220px; height: 56px; }
          .slot-item { font-size: 22px; height: 56px; }
        }
        @media (max-width: 576px) {
          .slot-container { width: 180px; height: 48px; }
          .slot-item { font-size: 18px; height: 48px; }
        }
      `}</style>
      <div className="sponsor-slot-machine">
        <div className="slot-container" ref={containerRef}>
          <div className="slot-scroller" ref={scrollerRef}></div>
        </div>
      </div>
    </div>
  );
};
export default SponsorSlotMachine;
