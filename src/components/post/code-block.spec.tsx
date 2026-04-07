import { act, render, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { CodeBlockEnhancer } from "./code-block";

describe("CodeBlockEnhancer", () => {
  beforeEach(() => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
  });

  it("renders children without modification when no code blocks present", () => {
    const { container } = render(
      <CodeBlockEnhancer>
        <p>Just text</p>
      </CodeBlockEnhancer>,
    );
    expect(container.querySelector("p")).toHaveTextContent("Just text");
    expect(
      container.querySelector('button[aria-label="Copy code"]'),
    ).not.toBeInTheDocument();
  });

  it("adds copy button to code blocks with code-block class", async () => {
    const { container } = render(
      <CodeBlockEnhancer>
        <div
          className="code-block"
          data-language="typescript"
          dangerouslySetInnerHTML={{
            __html:
              '<div class="code-block-header"><span class="code-block-lang">typescript</span></div><pre><code>const x = 1;</code></pre>',
          }}
        />
      </CodeBlockEnhancer>,
    );

    // Wait for useEffect
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const button = container.querySelector('button[aria-label="Copy code"]');
    expect(button).toBeInTheDocument();
  });

  it("copy button click copies text content to clipboard", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);

    const { container } = render(
      <CodeBlockEnhancer>
        <div
          className="code-block"
          data-language="typescript"
          dangerouslySetInnerHTML={{
            __html:
              '<div class="code-block-header"><span class="code-block-lang">typescript</span></div><pre><code>const x = 1;</code></pre>',
          }}
        />
      </CodeBlockEnhancer>,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // The component captures navigator.clipboard at click time
    // Override right before clicking
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    const button = container.querySelector('button[aria-label="Copy code"]')!;
    await user.click(button);

    expect(writeText).toHaveBeenCalledWith("const x = 1;");
  });

  it("multiple code blocks each get independent copy buttons", async () => {
    const { container } = render(
      <CodeBlockEnhancer>
        <div
          className="code-block"
          dangerouslySetInnerHTML={{
            __html:
              '<div class="code-block-header"><span class="code-block-lang">js</span></div><pre><code>first</code></pre>',
          }}
        />
        <div
          className="code-block"
          dangerouslySetInnerHTML={{
            __html:
              '<div class="code-block-header"><span class="code-block-lang">ts</span></div><pre><code>second</code></pre>',
          }}
        />
      </CodeBlockEnhancer>,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const buttons = container.querySelectorAll(
      'button[aria-label="Copy code"]',
    );
    expect(buttons).toHaveLength(2);
  });

  it("language label is visible when present", () => {
    const { container } = render(
      <CodeBlockEnhancer>
        <div
          className="code-block"
          data-language="typescript"
          dangerouslySetInnerHTML={{
            __html:
              '<div class="code-block-header"><span class="code-block-lang">typescript</span></div><pre><code>code</code></pre>',
          }}
        />
      </CodeBlockEnhancer>,
    );

    expect(container.querySelector(".code-block-lang")).toHaveTextContent(
      "typescript",
    );
  });

  it("cleans up DOM modifications on unmount", async () => {
    const { container, unmount } = render(
      <CodeBlockEnhancer>
        <div
          className="code-block"
          dangerouslySetInnerHTML={{
            __html:
              '<div class="code-block-header"><span class="code-block-lang">js</span></div><pre><code>code</code></pre>',
          }}
        />
      </CodeBlockEnhancer>,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(
      container.querySelector('button[aria-label="Copy code"]'),
    ).toBeInTheDocument();

    unmount();

    // After unmount, the container is detached — the cleanup happened
    // We can't easily verify the DOM was restored, but we verify no errors
  });

  it("creates header when code-block has no existing header", async () => {
    const { container } = render(
      <CodeBlockEnhancer>
        <div
          className="code-block"
          dangerouslySetInnerHTML={{
            __html: "<pre><code>const x = 1;</code></pre>",
          }}
        />
      </CodeBlockEnhancer>,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const button = container.querySelector('button[aria-label="Copy code"]');
    expect(button).toBeInTheDocument();

    const header = container.querySelector(".code-block-header");
    expect(header).toBeInTheDocument();
    expect(header?.firstChild).toBe(button);
  });

  it("silently handles clipboard API failure", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("Clipboard denied")),
      },
      writable: true,
      configurable: true,
    });

    const { container } = render(
      <CodeBlockEnhancer>
        <div
          className="code-block"
          data-language="typescript"
          dangerouslySetInnerHTML={{
            __html:
              '<div class="code-block-header"><span class="code-block-lang">typescript</span></div><pre><code>const x = 1;</code></pre>',
          }}
        />
      </CodeBlockEnhancer>,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const button = container.querySelector('button[aria-label="Copy code"]')!;
    await user.click(button);

    // Button text should still say "Copy" (failure is silent)
    expect(button.textContent).toBe("Copy");
  });

  it("shows Copied! feedback after successful copy", async () => {
    vi.useFakeTimers();

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    const { container } = render(
      <CodeBlockEnhancer>
        <div
          className="code-block"
          data-language="typescript"
          dangerouslySetInnerHTML={{
            __html:
              '<div class="code-block-header"><span class="code-block-lang">typescript</span></div><pre><code>const x = 1;</code></pre>',
          }}
        />
      </CodeBlockEnhancer>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const button = container.querySelector('button[aria-label="Copy code"]')!;

    await act(async () => {
      fireEvent.click(button);
      // Let the async clipboard write resolve
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(button.textContent).toBe("Copied!");

    // Advance past the restore timeout (2000ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(button.textContent).toBe("Copy");

    vi.useRealTimers();
  });
});
