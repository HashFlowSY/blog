"use client";

import { useEffect, useRef } from "react";

export function ContactHeading() {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (window.location.hash === "#contact")
      heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <h2 id="contact" tabIndex={-1} ref={heading}>
      <span id="contact-title">求职与合作</span>
    </h2>
  );
}
