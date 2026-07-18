'use client';

import ErrorState from '../../components/ErrorState';

export default function RoomsError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState error={error} reset={reset} title="Rooms Management Error" />;
}
