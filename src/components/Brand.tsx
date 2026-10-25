import Link from "next/link";
export function Brand() {
  return (
    <Link href="/" className="brand" prefetch={false} aria-label="PDFORGE home">
      <svg viewBox="0 0 36 40" width="30" height="34" fill="none" aria-hidden="true">
        <path d="M5 8h18l8 8v21H5z" fill="currentColor" opacity=".16" />
        <path d="M2 2h19l9 9v22H2z" fill="currentColor" />
        <path d="M20 2v10h10" stroke="#f4f7f1" strokeWidth="2" />
        <path d="M9 18h13M9 24h9" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span>
        PDFORGE<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
