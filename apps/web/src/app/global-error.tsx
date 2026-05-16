'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex h-screen flex-col items-center justify-center gap-4 p-4">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-sm text-gray-500">{error.message}</p>
          <button
            onClick={reset}
            className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
