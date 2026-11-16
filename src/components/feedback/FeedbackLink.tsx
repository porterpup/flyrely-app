import { MessageSquare } from 'lucide-react';
import { useAuth } from '~/context/AuthContext';
import { openFeedback } from '~/lib/feedback';
import { cn } from '~/lib/utils';

/** Quiet in-page "Send feedback" link. It sits in the page flow, so it never covers content. Signed-in users only. */
export function FeedbackLink({ className }: { className?: string }) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <button
      type="button"
      onClick={openFeedback}
      className={cn(
        'flex items-center gap-1.5 rounded-full min-h-11 px-3 py-2 text-body-sm text-ink-caption underline-offset-4 hover:underline',
        className
      )}
    >
      <MessageSquare className="h-3.5 w-3.5" aria-hidden />
      Send feedback
    </button>
  );
}
