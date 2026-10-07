"use client";
import Link from "next/link";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="page-main section-pad">
      <h1>A small pause.</h1>
      <p>Something went wrong loading this view.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
      <Link className="text-link" href="/">
        Back to Libaas ↗
      </Link>
    </main>
  );
}
