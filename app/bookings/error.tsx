'use client';

import ErrorState from '../../components/ErrorState';

export default function BookingsError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState error={error} reset={reset} title="Bookings Desk Error" />;
}
