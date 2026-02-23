import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  Search,
  TrendingUp,
  Clock,
  Plane,
  MapPin,
  ChevronRight,
  Sparkles,
  BarChart3,
  Globe,
} from 'lucide-react';
import { AppShell } from '~/components/layout';
import { Input } from '~/components/ui';

export const Route = createFileRoute('/explore/')({
  component: ExploreScreen,
});

const popularRoutes = [
  { from: 'SFO', to: 'JFK', reliability: 87, trend: 'up' },
  { from: 'LAX', to: 'ORD', reliability: 92, trend: 'stable' },
  { from: 'SEA', to: 'DEN', reliability: 78, trend: 'down' },
];

const insights = [
  {
    icon: Clock,
    title: 'Best times to fly',
    description: 'Early morning flights have 23% fewer delays',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: TrendingUp,
    title: 'Trending airports',
    description: 'See which airports are performing best right now',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: BarChart3,
    title: 'Airline rankings',
    description: 'Compare on-time performance across carriers',
    color: 'bg-purple-100 text-purple-600',
  },
];

const comingSoon = [
  {
    icon: Sparkles,
    title: 'Personalized alerts',
    description: 'Get notified when your favorite routes have low delay risk',
  },
  {
    icon: Globe,
    title: 'Airport guides',
    description: 'Terminal maps, amenities, and connection tips',
  },
];

function ExploreScreen() {
  const navigate = useNavigate();

  return (
    <AppShell>
      <div className="px-4 pt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy-900 mb-1">Explore</h1>
          <p className="text-navy-500">Discover flight insights and trends</p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <Input
            placeholder="Search routes, airports, or airlines..."
            leftIcon={<Search className="w-5 h-5" />}
          />
        </div>

        {/* Popular Routes */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">
            Popular routes
          </h2>

          <div className="space-y-3">
            {popularRoutes.map((route) => (
              <button
                key={`${route.from}-${route.to}`}
                className="w-full flex items-center justify-between p-4 bg-white border border-navy-200 rounded-xl hover:border-navy-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center">
                    <Plane className="w-5 h-5 text-navy-600 rotate-45" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-navy-900">{route.from}</span>
                      <ChevronRight className="w-4 h-4 text-navy-400" />
                      <span className="font-semibold text-navy-900">{route.to}</span>
                    </div>
                    <p className="text-sm text-navy-500">
                      {route.reliability}% on-time performance
                    </p>
                  </div>
                </div>

                <div
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    route.reliability >= 90
                      ? 'bg-green-100 text-green-700'
                      : route.reliability >= 80
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {route.reliability >= 90
                    ? 'Reliable'
                    : route.reliability >= 80
                    ? 'Moderate'
                    : 'Variable'}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Insights */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">
            Flight insights
          </h2>

          <div className="space-y-3">
            {insights.map((insight) => {
              const Icon = insight.icon;
              return (
                <button
                  key={insight.title}
                  className="w-full flex items-center gap-4 p-4 bg-white border border-navy-200 rounded-xl hover:border-navy-300 transition-colors"
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${insight.color}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-navy-900">{insight.title}</p>
                    <p className="text-sm text-navy-500">{insight.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-navy-400" />
                </button>
              );
            })}
          </div>
        </section>

        {/* Coming Soon */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Coming soon</h2>

          <div className="bg-gradient-to-br from-primary-50 to-accent-50 border border-primary-200 rounded-xl p-4">
            <div className="space-y-4">
              {comingSoon.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <Icon className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-navy-900">{feature.title}</p>
                      <p className="text-sm text-navy-600">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-navy-500 mt-4 text-center">
              We're working on new features. Stay tuned!
            </p>
          </div>
        </section>

        {/* What is Explore? */}
        <section className="mb-8">
          <div className="bg-navy-50 rounded-xl p-4">
            <h3 className="font-semibold text-navy-900 mb-2">What is Explore?</h3>
            <p className="text-sm text-navy-600">
              Explore helps you make smarter travel decisions. Browse route
              reliability data, discover the best times to fly, and learn which
              airlines and airports perform best—before you book your next trip.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
