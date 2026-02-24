import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { BarChart3, TrendingUp, DollarSign, Zap, Download } from 'lucide-react';
import { Header } from '~/components/ui';

export const Route = createFileRoute('/account/usage')({
  component: UsageDashboardScreen,
});

const API_BASE = 'https://web-production-ea1e9.up.railway.app';

interface UsageData {
  period_days: number;
  total_predictions: number;
  total_weather_calls: number;
  estimated_cost_usd: number;
  avg_predictions_per_day: number;
  daily: { date: string; predictions: number; weather_calls: number }[];
  top_routes: { route: string; predictions: number }[];
  by_risk_level: { low: number; medium: number; high: number };
  note: string;
  message?: string;
}

function UsageDashboardScreen() {
  const navigate = useNavigate();
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`${API_BASE}/usage?days=${period}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError('Could not load usage data'); setLoading(false); });
  }, [period]);

  const handleExport = () => {
    window.open(`${API_BASE}/usage/export`, '_blank');
  };

  const maxDailyPredictions = data
    ? Math.max(...data.daily.map((d) => d.predictions), 1)
    : 1;

  return (
    <div className="app-container">
      <div className="screen">
        <Header
          title="API Usage"
          showBack
          onBackClick={() => navigate({ to: '/account' })}
          rightAction={
            <button
              onClick={handleExport}
              className="p-2 text-navy-500 hover:text-navy-700 rounded-lg hover:bg-navy-50"
              title="Export CSV"
            >
              <Download className="w-5 h-5" />
            </button>
          }
        />

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {/* Period selector */}
          <div className="flex bg-navy-100 rounded-xl p-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  period === d ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-600'
                }`}
              >
                {d === 7 ? '7 days' : d === 30 ? '30 days' : '90 days'}
              </button>
            ))}
          </div>

          {loading && (
            <div className="text-center py-16 text-navy-400">Loading...</div>
          )}
          {error && (
            <div className="text-center py-16 text-red-500">{error}</div>
          )}

          {data && !loading && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-navy-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-primary-500" />
                    <span className="text-xs text-navy-500 font-medium">Predictions</span>
                  </div>
                  <p className="text-2xl font-bold text-navy-900">{data.total_predictions}</p>
                  <p className="text-xs text-navy-400 mt-0.5">{data.avg_predictions_per_day}/day avg</p>
                </div>
                <div className="bg-white border border-navy-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-navy-500 font-medium">Est. Cost</span>
                  </div>
                  <p className="text-2xl font-bold text-navy-900">${data.estimated_cost_usd.toFixed(3)}</p>
                  <p className="text-xs text-navy-400 mt-0.5">{data.total_weather_calls} weather calls</p>
                </div>
                <div className="bg-white border border-navy-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-navy-500 font-medium">Risk breakdown</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {(['high', 'medium', 'low'] as const).map((r) => {
                      const count = data.by_risk_level?.[r] ?? 0;
                      const pct = data.total_predictions > 0 ? Math.round(count / data.total_predictions * 100) : 0;
                      const color = r === 'high' ? 'bg-red-400' : r === 'medium' ? 'bg-amber-400' : 'bg-green-400';
                      return (
                        <div key={r} className="flex items-center gap-2">
                          <span className="text-xs text-navy-500 w-12 capitalize">{r}</span>
                          <div className="flex-1 bg-navy-100 rounded-full h-1.5">
                            <div className={`${color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-navy-500 w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-white border border-navy-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-navy-500 font-medium">Top routes</span>
                  </div>
                  {data.top_routes.length === 0 ? (
                    <p className="text-xs text-navy-400">No data yet</p>
                  ) : (
                    <div className="space-y-1">
                      {data.top_routes.slice(0, 3).map((r) => (
                        <div key={r.route} className="flex items-center justify-between">
                          <span className="text-xs font-medium text-navy-700">{r.route}</span>
                          <span className="text-xs text-navy-400">{r.predictions}x</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Daily bar chart */}
              {data.daily.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-3">
                    Daily predictions
                  </h3>
                  <div className="bg-white border border-navy-200 rounded-xl p-4">
                    <div className="flex items-end gap-1 h-24">
                      {data.daily.slice(0, 30).reverse().map((d) => {
                        const heightPct = (d.predictions / maxDailyPredictions) * 100;
                        return (
                          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                            <div
                              className="w-full bg-primary-400 rounded-sm transition-all group-hover:bg-primary-600"
                              style={{ height: `${Math.max(heightPct, 4)}%` }}
                            />
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-navy-900 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              {d.date.slice(5)}: {d.predictions}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-navy-400 mt-2 text-center">Last {Math.min(data.daily.length, 30)} days</p>
                  </div>
                </section>
              )}

              {/* Note */}
              <p className="text-xs text-navy-400 text-center">{data.note}</p>

              {/* Empty state */}
              {data.total_predictions === 0 && (
                <div className="text-center py-8">
                  <p className="text-4xl mb-3">📊</p>
                  <p className="font-medium text-navy-700">No predictions yet</p>
                  <p className="text-sm text-navy-500 mt-1">Add a flight to start tracking usage</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
