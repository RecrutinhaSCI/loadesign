import { useEffect, useRef } from "react";

/**
 * Fade-in + slide-up reveal triggered by IntersectionObserver.
 * @param {number} delay   - transition-delay in ms
 * @param {number} threshold - intersection threshold (0–1)
 */
export function useRevealDelay(delay = 0, threshold = 0.12) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.opacity = "0";
    el.style.transform = "translateY(32px)";
    el.style.transition = [
      `opacity 0.9s cubic-bezier(.22,1,.36,1) ${delay}ms`,
      `transform 0.9s cubic-bezier(.22,1,.36,1) ${delay}ms`,
    ].join(", ");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, threshold]);

  return ref;
}

/**
 * Same as above, but fires on mount (Hero / above-fold use).
 */
export function useFadeIn(delay = 0) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.opacity = "0";
    el.style.transform = "translateY(28px)";
    el.style.transition = [
      `opacity 0.9s cubic-bezier(.22,1,.36,1) ${delay}ms`,
      `transform 0.9s cubic-bezier(.22,1,.36,1) ${delay}ms`,
    ].join(", ");

    const timer = setTimeout(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, 60);

    return () => clearTimeout(timer);
  }, [delay]);

  return ref;
}
