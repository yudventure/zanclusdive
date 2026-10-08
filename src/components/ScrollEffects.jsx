"use client";
import { useEffect, useRef } from "react";

export default function ScrollEffects({ rootRef }) {
  const progressRef = useRef(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stop = () => {};
    function start() {
      stop();
      if (reduced.matches || !window.IntersectionObserver) return;
      const seen = new WeakSet();
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.remove("reveal-pending");
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        },
        { rootMargin: "0px 0px -32px 0px", threshold: 0.04 },
      );
      function observe() {
        for (const element of root.querySelectorAll("[data-reveal]")) {
          if (seen.has(element) || !element.getClientRects().length) continue;
          seen.add(element);
          // Above-fold content stays visible immediately, including deep links.
          if (element.getBoundingClientRect().top < window.innerHeight - 32)
            element.classList.add("is-revealed");
          else {
            element.classList.add("reveal-pending");
            observer.observe(element);
          }
        }
      }
      let frame = 0;
      function update() {
        frame = 0;
        const maximum =
          document.documentElement.scrollHeight - window.innerHeight;
        const progress =
          maximum > 0 ? Math.min(1, Math.max(0, window.scrollY / maximum)) : 0;
        if (progressRef.current)
          progressRef.current.style.transform = `scaleX(${progress})`;
        const hero = root.querySelector("[data-parallax]");
        const desktop = window.matchMedia(
          "(min-width: 900px) and (pointer: fine)",
        ).matches;
        if (hero && desktop) {
          const bounds = hero.getBoundingClientRect();
          if (bounds.bottom > 0 && bounds.top < window.innerHeight)
            hero.style.setProperty(
              "--hero-drift",
              `${Math.min(32, Math.max(0, -bounds.top * 0.055))}px`,
            );
        } else hero?.style.removeProperty("--hero-drift");
      }
      function schedule() {
        if (!frame) frame = requestAnimationFrame(update);
      }
      function focus(event) {
        // Keyboard navigation must never focus an invisible control.
        for (const element of root.querySelectorAll(".reveal-pending")) {
          if (element.contains(event.target)) {
            element.classList.remove("reveal-pending");
            element.classList.add("is-revealed");
            observer.unobserve(element);
          }
        }
      }
      const mutations = new MutationObserver(() => {
        observe();
        schedule();
      });
      mutations.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["hidden"],
      });
      const resize = window.ResizeObserver
        ? new ResizeObserver(schedule)
        : null;
      resize?.observe(root);
      observe();
      root.classList.add("motion-active");
      update();
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule, { passive: true });
      root.addEventListener("focusin", focus);
      stop = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        mutations.disconnect();
        resize?.disconnect();
        window.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", schedule);
        root.removeEventListener("focusin", focus);
        root.classList.remove("motion-active");
        root
          .querySelector("[data-parallax]")
          ?.style.removeProperty("--hero-drift");
        for (const element of root.querySelectorAll("[data-reveal]"))
          element.classList.remove("reveal-pending", "is-revealed");
      };
    }
    start();
    reduced.addEventListener("change", start);
    return () => {
      stop();
      reduced.removeEventListener("change", start);
    };
  }, [rootRef]);
  return (
    <div className="scroll-progress" ref={progressRef} aria-hidden="true" />
  );
}
