import type { DelaySeverity } from '~/types';

interface Props {
  severity: DelaySeverity;
  compact?: boolean;
  /** Use light text — for rendering on dark/colored backgrounds */
  onDark?: boolean;
}

/**
 * Visual breakdown of delay severity probabilities.
 * Shows: "If this flight is delayed: X% minor / Y% moderate / Z% severe"
 */
export function DelaySeverityBar({ severity, compact = false, onDark = false }: Props) {
  const minorPct = Math.round(severity.minor_pct * 100);
  const moderatePct = Math.round(severity.moderate_pct * 100);
  const severePct = Math.round(severity.severe_pct * 100);

  if (compact) {
    const labelClass = onDark ? 'text-white/60' : 'text-navy-500';
    const textClass = onDark ? 'text-white/90' : 'text-navy-600';
    return (
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${textClass}`}>
        <span className={`font-medium ${labelClass}`}>If delayed:</span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block flex-shrink-0" />
          {minorPct}% minor
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-400 inline-block flex-shrink-0" />
          {moderatePct}% moderate
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block flex-shrink-0" />
          {severePct}% severe
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider">
        If delayed — severity breakdown
      </p>

      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        {minorPct > 0 && (
          <div
            className="bg-yellow-400 transition-all"
            style={{ width: `${minorPct}%` }}
            title={`Minor (15–44 min): ${minorPct}%`}
          />
        )}
        {moderatePct > 0 && (
          <div
            className="bg-orange-400 transition-all"
            style={{ width: `${moderatePct}%` }}
            title={`Moderate (45–119 min): ${moderatePct}%`}
          />
        )}
        {severePct > 0 && (
          <div
            className="bg-red-500 transition-all"
            style={{ width: `${severePct}%` }}
            title={`Severe (120+ min): ${severePct}%`}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 flex-shrink-0" />
          <span className="text-navy-600">
            <span className="font-semibold">{minorPct}%</span> minor
            <span className="text-navy-400 ml-1">(15–44 min)</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-orange-400 flex-shrink-0" />
          <span className="text-navy-600">
            <span className="font-semibold">{moderatePct}%</span> moderate
            <span className="text-navy-400 ml-1">(45–119 min)</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-500 flex-shrink-0" />
          <span className="text-navy-600">
            <span className="font-semibold">{severePct}%</span> severe
            <span className="text-navy-400 ml-1">(120+ min)</span>
          </span>
        </div>
      </div>
    </div>
  );
}
