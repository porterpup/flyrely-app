import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Mail, Lock, Eye, EyeOff, User, Plane, Check } from 'lucide-react';
import { Button, Input } from '~/components/ui';

export const Route = createFileRoute('/auth/signup')({
  component: SignUpScreen,
});

function SignUpScreen() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    terms?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One number', met: /\d/.test(password) },
  ];

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!passwordRequirements.every((r) => r.met)) {
      newErrors.password = 'Password does not meet requirements';
    }
    if (!acceptedTerms) {
      newErrors.terms = 'You must accept the terms and conditions';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    navigate({ to: '/' });
  };

  return (
    <div className="app-container">
      <div className="screen px-6 pt-12 pb-8">
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
            <Plane className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-navy-900">Create account</h1>
          <p className="text-navy-500 mt-1">Start tracking your flights today</p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <Input
            label="Full name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            leftIcon={<User className="h-5 w-5" />}
            autoComplete="name"
          />

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            leftIcon={<Mail className="h-5 w-5" />}
            autoComplete="email"
          />

          <div>
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              leftIcon={<Lock className="h-5 w-5" />}
              rightIcon={
                showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )
              }
              onRightIconClick={() => setShowPassword(!showPassword)}
              autoComplete="new-password"
            />

            {/* Password requirements */}
            {password && (
              <div className="mt-3 space-y-1.5">
                {passwordRequirements.map((req, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        req.met ? 'bg-green-100 text-green-600' : 'bg-navy-100 text-navy-400'
                      }`}
                    >
                      {req.met && <Check className="w-3 h-3" />}
                    </div>
                    <span className={req.met ? 'text-green-700' : 'text-navy-500'}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Terms checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-navy-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-navy-600">
                I agree to the{' '}
                <Link to="/legal/terms" className="text-primary-600 font-medium">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/legal/privacy" className="text-primary-600 font-medium">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {errors.terms && (
              <p className="mt-1.5 text-sm text-red-600">{errors.terms}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 space-y-4">
          <Button fullWidth size="lg" onClick={handleSignUp} loading={isLoading}>
            Create Account
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-navy-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-navy-500">or continue with</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 px-4 py-3 border border-navy-200 rounded-xl hover:bg-navy-50 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z"
                />
                <path
                  fill="#34A853"
                  d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z"
                />
                <path
                  fill="#4A90E2"
                  d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z"
                />
              </svg>
              <span className="text-sm font-medium text-navy-700">Google</span>
            </button>

            <button className="flex items-center justify-center gap-2 px-4 py-3 border border-navy-200 rounded-xl hover:bg-navy-50 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
              </svg>
              <span className="text-sm font-medium text-navy-700">Apple</span>
            </button>
          </div>
        </div>

        {/* Sign In Link */}
        <div className="mt-auto pt-6 text-center">
          <p className="text-navy-500">
            Already have an account?{' '}
            <Link
              to="/auth/login"
              className="text-primary-600 font-semibold hover:text-primary-700"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
