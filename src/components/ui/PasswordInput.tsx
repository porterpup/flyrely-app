import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, type InputProps } from './Input';

/** Password field with a show/hide toggle (44 px target, labelled for screen readers). */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'rightIcon' | 'onRightIconClick'>>(
  (props, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <Input
        ref={ref}
        {...props}
        type={visible ? 'text' : 'password'}
        rightIcon={visible ? <EyeOff /> : <Eye />}
        rightIconLabel={visible ? 'Hide password' : 'Show password'}
        onRightIconClick={() => setVisible((v) => !v)}
      />
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
