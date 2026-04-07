"use client";

export default function GlobalError({
  unstable_retry: retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background px-6">
        <title>Error</title>
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold tracking-tight">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            An unexpected error occurred. Please try again.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={retry}
              className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-accent"
            >
              Try again
            </button>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:opacity-80"
            >
              Back to Home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
