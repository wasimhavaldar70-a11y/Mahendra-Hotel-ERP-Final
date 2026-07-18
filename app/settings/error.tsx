'use client';

import ErrorState from '../../components/ErrorState';

export default function SettingsError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState error={error} reset={reset} title="Settings Panel Error" />;
}
