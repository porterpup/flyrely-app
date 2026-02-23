import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button, Input, Header } from '~/components/ui';

export const Route = createFileRoute('/auth/forgot-password')({
  component: ForgotPasswordScreen,
});

function ForgotPasswordScreen() {
  const navigate = useNavigate();
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
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="app-container">
        <div className="screen px-6 pt-12 pb-8">
          <Header
            title=""
            showBack
            onBackClick={() => navigate({ to: '/auth/login' })}
            transparent
          />

          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <h1 className="text-2xl font-bold text-navy-900 mb-2">Check your email</h1>
            <p className="text-navy-500 mb-8">
              We've sent password reset instructions to{' '}
              <span className="font-medium text-navy-700">{email}</span>
            </p>

            <Button
              variant="outline"
              onClick={() => navigate({ to: '/auth/login' })}
            >
              Back to Sign In
            </Button>

            <p className="mt-8 text-sm text-navy-500">
              Didn't receive the email?{' '}
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-primary-600 font-medium"
              >
                Try again
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="screen px-6 pt-12 pb-8">
        <Header
          title=""
          showBack
          onBackClick={() => navigate({ to: '/auth/login' })}
          transparent
        />

        <div className="flex-1">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-navy-900 mb-2">
              Forgot password?
            </h1>
            <p className="text-navy-500">
              No worries! Enter your email and we'll send you reset instructions.
            </p>
          </div>

          <div className="space-y-6">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
              leftIcon={<Mail className="h-5 w-5" />}
              autoComplete="email"
            />

            <Button fullWidth size="lg" onClick={handleSubmit} loading={isLoading}>
              Send Reset Link
            </Button>
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/auth/login"
              className="inline-flex items-center gap-2 text-navy-600 hover:text-navy-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
