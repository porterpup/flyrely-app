import { cn } from '~/lib/utils';

/** FlyRely mark: the paper plane on brand blue. Inline SVG, no asset to load. */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="FlyRely"
      className={cn('shrink-0', className)}
    >
      <rect width="48" height="48" rx="12" fill="#276EF1" />
      <g fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M35 13 28 36l-5.5-10.5L12 20Z" />
        <path d="M35 13 22.5 25.5" />
      </g>
    </svg>
  );
}
