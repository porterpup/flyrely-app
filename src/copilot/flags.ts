// Build-time feature flags for the disruption copilot (plan §5).
// Vite replaces `import.meta.env.VITE_*` with literals at build time, so with the
// flag unset these resolve to `false` and the bundler drops the copilot code.

export const COPILOT_ENABLED: boolean = import.meta.env.VITE_FEATURE_DISRUPTION_COPILOT === 'true';

// Push requires the master flag.
export const COPILOT_PUSH_ENABLED: boolean =
  import.meta.env.VITE_FEATURE_DISRUPTION_COPILOT === 'true' &&
  import.meta.env.VITE_FEATURE_COPILOT_PUSH === 'true';
