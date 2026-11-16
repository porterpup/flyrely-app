import { Bell, BellOff, BellRing } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui';

export interface PushPermissionPromptProps {
  /** prompt: not asked yet. enabled: subscribed. denied: the browser blocked notifications. */
  status: 'prompt' | 'enabled' | 'denied';
  /** Called on tap only. The browser permission is never requested before this. */
  onEnable: () => void;
  onDisable?: () => void;
  className?: string;
}

/** "Alert me" prompt for the 24-hour heads-up push. */
export function PushPermissionPrompt({ status, onEnable, onDisable, className }: PushPermissionPromptProps) {
  const muted = 'text-ink-caption';
  const Icon = status === 'enabled' ? BellRing : status === 'denied' ? BellOff : Bell;
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-btn p-inset',
        'bg-surface-card text-ink',
        className
      )}
    >
      <Icon className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-body-lg font-medium">
          {status === 'enabled' ? 'Alerts are on' : status === 'denied' ? 'Notifications are blocked' : 'Alert me'}
        </p>
        <p className={cn('text-body-md', muted)}>
          {status === 'enabled' &&
            "We'll send one heads-up within 24 hours of departure if this flight is at high risk, and one if it's cancelled."}
          {status === 'denied' && 'Allow notifications for FlyRely in your browser settings to get a heads-up.'}
          {status === 'prompt' &&
            "Get one heads-up within 24 hours of departure if this flight is at high risk. We'll only ask your browser when you tap."}
        </p>
        {status === 'prompt' && (
          <Button
            size="sm"
            onClick={onEnable}
          >
            Alert me
          </Button>
        )}
        {status === 'enabled' && onDisable && (
          <Button size="sm" variant="text" onClick={onDisable}>
            Turn off
          </Button>
        )}
      </div>
    </div>
  );
}
