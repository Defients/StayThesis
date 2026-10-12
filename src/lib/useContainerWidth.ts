import { useEffect, useRef, useState } from 'react';

/**
 * Measure a container's content width so SVG charts can render at real pixel
 * size (crisp, fixed-size labels) instead of relying on viewBox scaling.
 * Returns a sensible default until measured (SSR, jsdom, no ResizeObserver).
 */
export function useContainerWidth<T extends HTMLElement = HTMLDivElement>(
  defaultWidth = 640,
) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(defaultWidth);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof ResizeObserver === 'undefined') {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(w);
      return;
    }
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(w);
    });
    ro.observe(el);
    const w = el.getBoundingClientRect().width;
    if (w > 0) setWidth(w);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}
