import React, { useEffect, useRef } from "react";

type Props = {
  width?: number;
  height?: number;
  text?: string;
  font?: string;
  baseColor?: string;
  hoverColor?: string;
  hoverBg?: string;
  hovered?: boolean;
};

export default function VersoairDistortion({
  width = 260,
  height = 40,
  text = "versoair™️",
  font = "27px 'GoldenBeachPersonalUse-BdIt', system-ui, -apple-system, \"Segoe UI\", Roboto, Helvetica, Arial",
  baseColor = "#F59E0B",
  hoverColor = "red",
  hoverBg = "#02040a",
  hovered: hoveredProp,
}: Props) {
  const [internalHovered, setInternalHovered] = React.useState(false);
  const hovered =
    typeof hoveredProp === "boolean" ? hoveredProp : internalHovered;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const off = document.createElement("canvas");
    offRef.current = off;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    off.width = canvas.width;
    off.height = canvas.height;
    const offCtx = off.getContext("2d")!;
    offCtx.scale(dpr, dpr);

    function redrawOffscreen() {
      offCtx.clearRect(0, 0, width, height);
      offCtx.fillStyle = hovered ? hoverBg : "transparent";
      offCtx.fillRect(0, 0, width, height);
      offCtx.font = font;
      offCtx.textBaseline = "middle";
      offCtx.fillStyle = hovered ? hoverColor : baseColor;
      const metrics = offCtx.measureText(text);
      const tx = (width - metrics.width) / 2;
      const ty = height / 2;
      offCtx.fillText(text, tx, ty + 2);
    }

    // Ensure the custom font is loaded before drawing to canvas
    (async () => {
      try {
        if (document.fonts && document.fonts.load) {
          await document.fonts.load(`32px "GoldenBeachPersonalUse-BdIt"`);
          const ok = document.fonts.check(`12px "GoldenBeachPersonalUse-BdIt"`);
          console.debug(
            "GoldenBeach font available?",
            ok,
            "fonts.status=",
            document.fonts.status,
          );
        }
      } catch (e) {
        console.debug("GoldenBeach font load error", e);
      }
      // If font isn't available, log available font families for troubleshooting
      try {
        // @ts-ignore
        const families = Array.from((document as any).fonts)
          .map((f: any) => f.family)
          .slice(0, 10);
        console.debug("Document.fonts sample families:", families);
      } catch (e) {
        // ignore
      }
      redrawOffscreen();
    })();

    let t = 0;
    let raf = 0 as number;

    function draw() {
      t += 0.02;
      // clear
      ctx.clearRect(0, 0, width, height);

      // draw base with slight blur for glow
      ctx.save();
      ctx.filter = "blur(0.6px)";
      ctx.drawImage(off, 0, 0, width, height);
      ctx.restore();

      // get image data from offscreen using device pixels
      const pxW = Math.round(width * (window.devicePixelRatio || 1));
      const pxH = Math.round(height * (window.devicePixelRatio || 1));
      const img = offCtx.getImageData(0, 0, pxW, pxH);
      const out = ctx.createImageData(pxW, pxH);

      // horizontal sine displacement per row (operate in device pixels)
      const amplitude = hovered ? 18 : 10; // pixels
      const wavelength = 80; // pixels
      for (let y = 0; y < pxH; y++) {
        const offsetX = Math.round(
          Math.sin((y / wavelength) * Math.PI * 2 + t * 2) *
            amplitude *
            Math.sin(t + y * 0.01),
        );
        for (let x = 0; x < pxW; x++) {
          const sx = Math.min(pxW - 1, Math.max(0, x + offsetX));
          const srcIdx = (y * pxW + sx) * 4;
          const dstIdx = (y * pxW + x) * 4;
          out.data[dstIdx] = img.data[srcIdx];
          out.data[dstIdx + 1] = img.data[srcIdx + 1];
          out.data[dstIdx + 2] = img.data[srcIdx + 2];
          out.data[dstIdx + 3] = img.data[srcIdx + 3];
        }
      }

      ctx.putImageData(out, 0, 0);

      // overlay color channels shifted for chromatic effect when hovered
      if (hovered) {
        ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(off, Math.sin(t * 1.3) * 2, Math.cos(t * 1.7) * 1);
        ctx.globalCompositeOperation = "source-over";
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(raf);
  }, [width, height, text, font, hovered, baseColor, hoverColor, hoverBg]);

  return (
    <div
      onMouseEnter={
        typeof hoveredProp === "boolean"
          ? undefined
          : () => setInternalHovered(true)
      }
      onMouseLeave={
        typeof hoveredProp === "boolean"
          ? undefined
          : () => setInternalHovered(false)
      }
      style={{ display: "inline-block", cursor: "pointer" }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: `${width}px`, height: `${height}px` }}
        width={width}
        height={height}
        aria-label={text}
        role="img"
      />
    </div>
  );
}
