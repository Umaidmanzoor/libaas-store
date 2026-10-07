export default function Loading() {
  return (
    <main className="page-main section-pad" aria-busy="true">
      <p role="status">Finding your next favourite…</p>
      <div className="skeleton-grid">
        {[1, 2, 3].map((i) => (
          <div className="skeleton" key={i} />
        ))}
      </div>
    </main>
  );
}
