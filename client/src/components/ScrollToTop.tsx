import { useEffect } from "react";
import { useLocation } from "wouter";

export default function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Instant jump to avoid mid-page anchor; scroll to (0,0) synchronously
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [location]);
  
  return null;
}