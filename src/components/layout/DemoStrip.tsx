/** Persistent, unobtrusive demo-data notice pinned to the top of content. */
export function DemoStrip() {
  return (
    <div className="sticky top-14 z-30 border-b border-line/70 bg-bg/85 px-4 py-1.5 backdrop-blur sm:px-6 lg:top-0 lg:px-8">
      <p className="flex items-center gap-2 text-[11px] tracking-wide text-muted">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warning" />
        <span>
          <strong className="font-semibold text-secondary">DEMO DATA</strong>
          {' · '}
          synthetic figures, not verified research
        </span>
      </p>
    </div>
  );
}
