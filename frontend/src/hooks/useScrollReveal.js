import { useEffect } from 'react';

/**
 * useScrollReveal
 * Observes every .reveal, .reveal-left, .reveal-right,
 * .reveal-scale, .reveal-fade, .reveal-flip element on the page
 * and adds the class "revealed" when they enter the viewport.
 *
 * Call at the top of any page component.
 * Pass dep values (e.g. [dataLoaded]) to re-scan after async content mounts.
 */
const useScrollReveal = (deps = []) => {
  useEffect(() => {
    const selectors = [
      '.reveal',
      '.reveal-left',
      '.reveal-right',
      '.reveal-scale',
      '.reveal-fade',
      '.reveal-flip',
    ].join(', ');

    const targets = Array.from(document.querySelectorAll(selectors));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target); // trigger only once
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -52px 0px',
      }
    );

    // Small timeout so elements have time to be painted after async render
    const timer = setTimeout(() => {
      targets.forEach((el) => observer.observe(el));
    }, 80);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };

  }, deps);
};

export default useScrollReveal;