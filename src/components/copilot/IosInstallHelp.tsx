import { useState } from 'react';
import { Plus, Share, Smartphone } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button, Modal } from '~/components/ui';

export interface IosInstallHelpProps {
  onDark?: boolean;
  className?: string;
  /** Start with the steps sheet open (gallery and tests). */
  defaultOpen?: boolean;
}

const STEPS = [
  { icon: Share, text: 'In Safari, tap the Share button at the bottom of the screen.' },
  { icon: Plus, text: 'Scroll down and tap "Add to Home Screen", then tap Add.' },
  { icon: Smartphone, text: 'Open FlyRely from your Home Screen, then come back here and tap "Alert me".' },
] as const;

/** The steps themselves. Shown in a sheet from the prompt. */
export function IosInstallSteps() {
  return (
    <div className="space-y-4 text-ink">
      <p className="text-body-md text-ink-caption">
        iPhone only allows alerts from apps on your Home Screen. It takes a few seconds and costs nothing.
      </p>
      <ol className="space-y-3">
        {STEPS.map(({ icon: Icon, text }, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <p className="text-body-md">
              <span className="sr-only">Step {i + 1}: </span>
              {text}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Shown instead of the "Alert me" button on iPhone and iPad when FlyRely is open in a Safari tab. */
export function IosInstallHelp({ onDark = true, className, defaultOpen = false }: IosInstallHelpProps) {
  const [open, setOpen] = useState(defaultOpen);
  const muted = onDark ? 'text-white/80' : 'text-ink-caption';
  return (
    <>
      <div
        className={cn(
          'flex items-start gap-3 rounded-btn p-inset',
          onDark ? 'bg-white/10 text-white' : 'bg-surface-muted text-ink',
          className
        )}
      >
        <Smartphone className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-body-lg font-medium">Add FlyRely to your Home Screen to get alerts</p>
          <p className={cn('text-body-md', muted)}>
            On iPhone, a heads-up before this flight only works from the Home Screen app.
          </p>
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            className={onDark ? '!bg-white !text-ink hover:!bg-white/90' : undefined}
          >
            Show me how
          </Button>
        </div>
      </div>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Add to Home Screen">
        <IosInstallSteps />
        <Button className="mt-5 w-full" onClick={() => setOpen(false)}>
          Got it
        </Button>
      </Modal>
    </>
  );
}
