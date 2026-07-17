'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/login');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FCFBF7]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        <span className="text-sm font-medium text-slate-500">Redirecting to StayDesk Login...</span>
      </div>
    </div>
  );
}
