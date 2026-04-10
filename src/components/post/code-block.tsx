"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

interface CodeBlockEnhancerProps {
  children: React.ReactNode;
}

export function CodeBlockEnhancer({ children }: CodeBlockEnhancerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("postPage");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const copyLabel = t("copyCode");
    const copiedLabel = t("copied");

    const blocks = container.querySelectorAll<HTMLElement>(".code-block");
    const cleanups: Array<() => void> = [];

    for (const block of blocks) {
      const header = block.querySelector<HTMLElement>(".code-block-header");
      const codeEl = block.querySelector<HTMLPreElement>("pre code");
      if (!codeEl) continue;

      const text = codeEl.textContent ?? "";

      // Create copy button
      const button = document.createElement("button");
      button.setAttribute("aria-label", copyLabel);
      button.setAttribute("type", "button");
      button.className =
        "code-block-copy inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/code-block:opacity-100";

      const copyIcon = document.createElement("span");
      copyIcon.innerHTML = copyLabel;
      button.appendChild(copyIcon);

      const handleClick = async () => {
        try {
          await navigator.clipboard.writeText(text);
          button.innerHTML = "";
          const checkIcon = document.createElement("span");
          checkIcon.textContent = copiedLabel;
          button.appendChild(checkIcon);
          button.classList.add("text-green-500");
          setTimeout(() => {
            button.innerHTML = "";
            const restoreIcon = document.createElement("span");
            restoreIcon.textContent = copyLabel;
            button.appendChild(restoreIcon);
            button.classList.remove("text-green-500");
          }, 2000);
        } catch {
          // Clipboard API unavailable — silently fail
        }
      };

      button.addEventListener("click", handleClick);
      cleanups.push(() => button.removeEventListener("click", handleClick));

      // Make the code-block a group for hover effects
      block.classList.add("group/code-block");

      if (header) {
        header.appendChild(button);
      } else {
        // No header — create one and prepend
        const newHeader = document.createElement("div");
        newHeader.className = "code-block-header";
        newHeader.appendChild(button);
        block.insertBefore(newHeader, block.firstChild);
      }
    }

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, [t]);

  return (
    <div ref={containerRef} className="contents">
      {children}
    </div>
  );
}
