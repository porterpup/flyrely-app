import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Bell, Mail, MessageSquare, Smartphone, Info } from 'lucide-react';
import { Header, Input } from '~/components/ui';
import { cn } from '~/lib/utils';
import type { RiskLevel } from '~/types';

export const Route = createFileRoute('/account/settings')({
  component: SettingsScreen,
});

function SettingsScreen() {
  const navigate = useNavigate();

  // Account info
  const [email, setEmail] = useState('john@example.com');
  const [phone, setPhone] = useState('+1 (555) 123-4567');

  // Notification channels
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  // Alert sensitivity
  const [minSeverity, setMinSeverity] = useState<RiskLevel>('medium');

  const severityOptions: { value: RiskLevel; label: string; description: string }[] = [
    {
      value: 'low',
      label: 'All changes',
      description: 'Get notified about any status change',
    },
    {
      value: 'medium',
      label: 'Only medium & high risk',
      description: 'Skip minor fluctuations',
    },
    {
      value: 'high',
      label: 'Only high risk',
      description: 'Only critical delay warnings',
    },
  ];

  return (
    <div className="app-container">
      <div className="screen">
        <Header
          title="Settings"
          showBack
          onBackClick={() => navigate({ to: '/account' })}
        />

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
          {/* Account Section */}
          <section>
            <h2 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-4">
              Account
            </h2>

            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-5 h-5" />}
              />

              <Input
                label="Phone number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<Smartphone className="w-5 h-5" />}
                hint="Required for SMS alerts"
              />

              <button className="text-sm text-primary-600 font-medium hover:text-primary-700">
                Change password
              </button>
            </div>
          </section>

          {/* Notification Channels */}
          <section>
            <h2 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-4">
              Notification channels
            </h2>

            <div className="bg-white border border-navy-200 rounded-xl divide-y divide-navy-100">
              <ToggleItem
                icon={Bell}
                label="Push notifications"
                description="Alerts on your device"
                enabled={pushEnabled}
                onToggle={() => setPushEnabled(!pushEnabled)}
              />

              <ToggleItem
                icon={Mail}
                label="Email"
                description="Alerts to your inbox"
                enabled={emailEnabled}
                onToggle={() => setEmailEnabled(!emailEnabled)}
              />

              <ToggleItem
                icon={MessageSquare}
                label="SMS"
                description="Text message alerts"
                enabled={smsEnabled}
                onToggle={() => setSmsEnabled(!smsEnabled)}
                badge={!smsEnabled ? 'Premium' : undefined}
              />
            </div>
          </section>

          {/* Alert Sensitivity */}
          <section>
            <h2 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-4">
              Alert sensitivity
            </h2>

            <p className="text-sm text-navy-600 mb-4">
              Set the minimum delay risk level that will trigger notifications.
            </p>

            <div className="space-y-3">
              {severityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setMinSeverity(option.value)}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border-2 transition-all',
                    minSeverity === option.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-navy-200 bg-white hover:border-navy-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-navy-900">{option.label}</p>
                      <p className="text-sm text-navy-500">{option.description}</p>
                    </div>
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                        minSeverity === option.value
                          ? 'border-primary-600 bg-primary-600'
                          : 'border-navy-300'
                      )}
                    >
                      {minSeverity === option.value && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Info Box */}
          <div className="bg-navy-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-navy-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-navy-600">
                <p className="font-medium text-navy-700 mb-1">How notifications work</p>
                <p>
                  We'll send you alerts when your flight's delay risk changes
                  based on real-time data and our prediction models. You can
                  adjust these settings anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Toggle item component
function ToggleItem({
  icon: Icon,
  label,
  description,
  enabled,
  onToggle,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-navy-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-navy-900">{label}</p>
            {badge && (
              <span className="px-2 py-0.5 bg-accent-100 text-accent-700 text-xs font-medium rounded-full">
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-navy-500">{description}</p>
        </div>
      </div>

      <button
        onClick={onToggle}
        className={cn(
          'relative w-12 h-7 rounded-full transition-colors',
          enabled ? 'bg-primary-600' : 'bg-navy-300'
        )}
      >
        <div
          className={cn(
            'absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform',
            enabled ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}
