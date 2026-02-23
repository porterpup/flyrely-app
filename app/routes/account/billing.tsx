import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Check, Crown, Plane, Bell, MessageSquare, Zap, X } from 'lucide-react';
import { Header, Button, Modal } from '~/components/ui';
import { cn } from '~/lib/utils';

export const Route = createFileRoute('/account/billing')({
  component: BillingScreen,
});

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    features: [
      { included: true, text: 'Track up to 3 flights' },
      { included: true, text: 'Push notifications' },
      { included: true, text: 'Basic delay predictions' },
      { included: false, text: 'Unlimited flights' },
      { included: false, text: 'SMS alerts' },
      { included: false, text: 'Advanced predictions' },
    ],
    current: true,
  },
  {
    id: 'monthly',
    name: 'Monthly Pass',
    price: 4.99,
    period: 'month',
    features: [
      { included: true, text: 'Unlimited flight tracking' },
      { included: true, text: 'Push notifications' },
      { included: true, text: 'SMS alerts' },
      { included: true, text: 'Advanced predictions' },
      { included: true, text: 'Priority support' },
    ],
    popular: true,
  },
  {
    id: 'annual',
    name: 'Platinum Annual',
    price: 79.99,
    period: 'year',
    originalPrice: 59.88,
    savings: '2 months free',
    features: [
      { included: true, text: 'Everything in Monthly Pass' },
      { included: true, text: 'Early access to new features' },
      { included: true, text: 'Airport insights & analytics' },
      { included: true, text: 'Route reliability reports' },
    ],
  },
];

function BillingScreen() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleSelectPlan = (planId: string) => {
    if (planId === 'free') return;
    setSelectedPlan(planId);
    setShowUpgradeModal(true);
  };

  return (
    <div className="app-container">
      <div className="screen">
        <Header
          title="Plans & Billing"
          showBack
          onBackClick={() => navigate({ to: '/account' })}
        />

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {/* Current Plan Banner */}
          <div className="bg-navy-100 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-navy-500">Current plan</p>
                <p className="text-lg font-bold text-navy-900">Free</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-navy-500">Flights tracked</p>
                <p className="text-lg font-bold text-navy-900">2 / 3</p>
              </div>
            </div>
          </div>

          {/* Plans */}
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Choose your plan</h2>

          <div className="space-y-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  'relative border-2 rounded-xl overflow-hidden transition-all',
                  plan.current
                    ? 'border-navy-300 bg-navy-50'
                    : plan.popular
                    ? 'border-accent-400 bg-white'
                    : 'border-navy-200 bg-white hover:border-navy-300'
                )}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-accent-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    MOST POPULAR
                  </div>
                )}

                {/* Savings badge */}
                {plan.savings && (
                  <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    {plan.savings.toUpperCase()}
                  </div>
                )}

                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-navy-900">{plan.name}</h3>
                        {plan.current && (
                          <span className="px-2 py-0.5 bg-navy-200 text-navy-700 text-xs font-medium rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-bold text-navy-900">
                          ${plan.price}
                        </span>
                        <span className="text-navy-500">/{plan.period}</span>
                      </div>
                    </div>

                    {plan.id !== 'free' && (
                      <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center">
                        <Crown className="w-6 h-6 text-accent-600" />
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-navy-300 flex-shrink-0" />
                        )}
                        <span
                          className={cn(
                            'text-sm',
                            feature.included ? 'text-navy-700' : 'text-navy-400'
                          )}
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {!plan.current && (
                    <Button
                      fullWidth
                      variant={plan.popular ? 'secondary' : 'outline'}
                      onClick={() => handleSelectPlan(plan.id)}
                    >
                      {plan.popular ? 'Get Started' : 'Select Plan'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* FAQ Link */}
          <div className="mt-8 text-center">
            <button className="text-sm text-primary-600 font-medium hover:text-primary-700">
              Have questions? View FAQ
            </button>
          </div>
        </div>

        {/* Upgrade Modal */}
        <Modal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          title="Upgrade to Premium"
        >
          <div className="space-y-4">
            <p className="text-navy-600">
              You're about to upgrade to the{' '}
              <strong>
                {plans.find((p) => p.id === selectedPlan)?.name}
              </strong>{' '}
              plan.
            </p>

            <div className="bg-navy-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-navy-600">Total</span>
                <span className="text-xl font-bold text-navy-900">
                  ${plans.find((p) => p.id === selectedPlan)?.price}/
                  {plans.find((p) => p.id === selectedPlan)?.period}
                </span>
              </div>
            </div>

            <p className="text-sm text-navy-500">
              You'll be charged after your free trial ends. Cancel anytime.
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowUpgradeModal(false)}
              >
                Cancel
              </Button>
              <Button variant="secondary" fullWidth>
                Start Free Trial
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
