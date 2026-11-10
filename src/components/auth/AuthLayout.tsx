import { LogoMark } from '~/components/ui/Logo';

export const TAGLINE = 'Know before delays happen.';

/** Shared frame for sign in, sign up and password screens: brand header on navy, form on a white sheet. */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-surface-card">
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col">
        <div className="px-6 pb-8 pt-[max(2.5rem,calc(env(safe-area-inset-top)+1.5rem))] text-white">
          <div className="flex items-center gap-3">
            <LogoMark size={40} />
            <span className="text-title-lg">FlyRely</span>
          </div>
          <p className="mt-6 text-heading-sm">{TAGLINE}</p>
        </div>
        <main className="flex flex-1 flex-col gap-5 rounded-t-4xl bg-white px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8">
          <div>
            <h1 className="text-title-lg text-ink">{title}</h1>
            {subtitle && <p className="mt-1 text-body-lg text-ink-caption">{subtitle}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
