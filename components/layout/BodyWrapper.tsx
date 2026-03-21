'use client';

import { ErrorBoundary } from './ErrorBoundary';

export function BodyWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}
