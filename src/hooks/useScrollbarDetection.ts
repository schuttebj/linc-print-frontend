import { useEffect, useState, RefObject } from 'react';

/**
 * Custom hook to detect if an element has a visible scrollbar
 * @param elementRef - Reference to the DOM element to check
 * @returns boolean indicating if scrollbar is visible
 */
export const useScrollbarDetection = (elementRef: RefObject<HTMLElement>): boolean => {
  const [hasScrollbar, setHasScrollbar] = useState(false);

  useEffect(() => {
    const checkScrollbar = () => {
      if (elementRef.current) {
        const element = elementRef.current;
        const hasVerticalScrollbar = element.scrollHeight > element.clientHeight;
        setHasScrollbar(hasVerticalScrollbar);
      }
    };

    // Check initially
    checkScrollbar();

    // Check when content changes (using ResizeObserver for better performance)
    const observer = new ResizeObserver(checkScrollbar);
    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    // Check on window resize as well
    const handleResize = () => checkScrollbar();
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [elementRef]);

  return hasScrollbar;
};
