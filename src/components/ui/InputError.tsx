import { AlertCircle } from 'lucide-react';
import { cn } from '~/lib/utils';

interface InputErrorProps {
  message: string;
  className?: string;
}

export function InputError({ message, className }: InputErrorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm text-red-600 mt-1.5',
        className
      )}
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// Validation error messages for flight search
export const validationErrors = {
  flightNumber: {
    required: 'Flight number is required',
    invalid: 'Please enter a valid flight number (e.g., UA1071)',
  },
  date: {
    required: 'Date is required',
    past: 'Cannot track flights in the past',
    tooFar: 'Can only track flights up to 14 days in advance',
    invalid: 'Please enter a valid date',
  },
  airport: {
    required: 'Airport is required',
    invalid: 'Please select a valid airport',
    sameOriginDest: 'Origin and destination cannot be the same',
  },
  email: {
    required: 'Email is required',
    invalid: 'Please enter a valid email address',
  },
  password: {
    required: 'Password is required',
    tooShort: 'Password must be at least 8 characters',
    noUppercase: 'Password must contain an uppercase letter',
    noNumber: 'Password must contain a number',
  },
};
