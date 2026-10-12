/** Small geometric brand mark — a gabled "stay" monogram. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 3 3 14v15h9v-9h8v9h9V14L16 3Z"
        stroke="#31B8D2"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="14.5" r="2.6" fill="#9B86E8" />
    </svg>
  );
}
