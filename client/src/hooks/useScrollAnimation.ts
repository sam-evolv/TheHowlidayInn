import { useEffect, useRef } from "react";

interface ScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useScrollAnimation(
  options: ScrollAnimationOptions = {}
) {
  const elementRef = useRef<HTMLDivElement>(null);
  const {
    threshold = 0.1,
    rootMargin = "0px",
    triggerOnce = false,
  } = options;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("scroll-animate-in");
            entry.target.classList.remove("scroll-animate-out");
          } else {
            if (!triggerOnce) {
              entry.target.classList.remove("scroll-animate-in");
              entry.target.classList.add("scroll-animate-out");
            }
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, rootMargin, triggerOnce]);

  return elementRef;
}
