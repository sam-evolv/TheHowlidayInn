import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Adds a CSS class to <html> for pages that need dark nav links on light backgrounds.
 * No header changes required.
 */
export default function RouteNavTheme() {
  const [location] = useLocation();

  useEffect(() => {
    const el = document.documentElement; // <html>
    const isLightTop = location === "/services" || location === "/about";
    el.classList.toggle("nav-on-light", isLightTop);
  }, [location]);

  return null;
}