import { forwardRef, type AnchorHTMLAttributes } from "react";
import { useLocation } from "wouter";
import { handleBackClick } from "@/lib/safe-navigation";

type BackLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  fallback?: string;
};

// A real link to `fallback` (new tab, crawlers) that sends a normal click back
// to the page the visitor came from.
const BackLink = forwardRef<HTMLAnchorElement, BackLinkProps>(function BackLink(
  { fallback = "/", onClick, ...props },
  ref,
) {
  const [, navigate] = useLocation();
  return (
    <a
      {...props}
      ref={ref}
      href={fallback}
      onClick={(event) => {
        onClick?.(event);
        handleBackClick(event, navigate, fallback);
      }}
    />
  );
});

export default BackLink;
