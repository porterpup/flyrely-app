import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button, Input } from '~/components/ui';
import { AuthLayout } from '~/components/auth/AuthLayout';
import { useAuth } from '~/context/AuthContext';

export const Route = createFileRoute('/auth/forgot-password')({
  component: ForgotPasswordScreen,
});

function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validate = () => {
    if (!email) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    const { error: resetError } = await resetPassword(email);
    setIsLoading(false);
    if (resetError) {
      setError(resetError);
      return;
    }
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <AuthLayout title="Check your email">
        <p className="text-body-lg text-ink-caption">
          We sent reset instructions to <span className="font-medium text-ink">{email}</span>.
        </p>
        <Button variant="secondary" fullWidth onClick={() => navigate({ to: '/auth/login' })}>
          Back to sign in
        </Button>
        <p className="text-body-md text-ink-caption">
          Didn't get it?{' '}
          <button onClick={() => setIsSubmitted(false)} className="font-medium text-surface-accent">
            Try again
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot password?" subtitle="Enter your email and we will send a reset link.">
      <Input
        label="Email"
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
        leftIcon={<Mail className="h-5 w-5" />}
        autoComplete="email"
      />
      <Button fullWidth onClick={handleSubmit} loading={isLoading}>
        Send reset link
      </Button>
      <Link to="/auth/login" className="inline-flex items-center gap-2 text-body-md font-medium text-surface-accent">
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>
    </AuthLayout>
  );
}
