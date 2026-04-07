import { useCallback, useState } from "react";

interface UseCopyToClipboardReturn {
  copied: boolean;
  copy: () => Promise<void>;
}

export function useCopyToClipboard(text: string): UseCopyToClipboardReturn {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable — silently fail
    }
  }, [text]);

  return { copied, copy };
}
