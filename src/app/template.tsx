'use client';

import { PageTransition } from '@/components/client/motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
