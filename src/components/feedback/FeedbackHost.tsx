import { useEffect, useState } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { Button, Modal, Select } from '~/components/ui';
import { useAuth } from '~/context/AuthContext';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MAX_LENGTH,
  OPEN_FEEDBACK_EVENT,
  buildFeedbackContext,
  sendFeedback,
  type FeedbackCategory,
} from '~/lib/feedback';

/** The feedback modal that FeedbackLink and the account page open. No floating button: it covered content on phones. Renders nothing when signed out. */
export function FeedbackHost() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_FEEDBACK_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_FEEDBACK_EVENT, onOpen);
  }, []);

  if (!user) return null;
  return (
    <>
      <FeedbackModal isOpen={open} onClose={() => setOpen(false)} pathname={pathname} />
    </>
  );
}

export function FeedbackModal({ isOpen, onClose, pathname }: { isOpen: boolean; onClose: () => void; pathname: string }) {
  const [category, setCategory] = useState<FeedbackCategory | ''>('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCategory('');
      setMessage('');
      setError('');
      setSent(false);
    }
  }, [isOpen]);

  async function submit() {
    setSending(true);
    setError('');
    try {
      await sendFeedback({ message, category, context: buildFeedbackContext(pathname) });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send feedback. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const canSend = message.trim().length > 0 && message.length <= FEEDBACK_MAX_LENGTH && !sending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send feedback">
      {sent ? (
        <div className="space-y-4">
          <p className="text-ink" role="status">Thanks — sent!</p>
          <Button fullWidth onClick={onClose}>Close</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value as FeedbackCategory | '')}>
            <option value="">Choose one (optional)</option>
            {FEEDBACK_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </Select>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="feedback-message" className="text-sm font-medium text-ink">Message</label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={FEEDBACK_MAX_LENGTH}
              rows={5}
              placeholder="What happened, or what would help?"
              className="w-full rounded-btn border border-surface-stroke p-3 text-ink focus:outline-none focus:ring-2 focus:ring-surface-accent"
            />
            <p className="text-xs text-ink-caption">We attach the screen you're on and any flight shown.</p>
          </div>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <Button fullWidth loading={sending} disabled={!canSend} onClick={submit}>Send</Button>
        </div>
      )}
    </Modal>
  );
}
