import { Construction } from 'lucide-react';
import { useDocumentTitle } from '@/app/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function MarketsPage() {
  useDocumentTitle('Market Intelligence — StayThesis');
  return (
    <>
      <PageHeader
        index="02"
        title="Market Intelligence"
        description="Synthetic market research — ADR, occupancy, seasonality, and regulatory posture for each candidate market."
      />
      <EmptyState
        icon={Construction}
        title="Market Intelligence is being built"
        body="Market cards, seasonality curves, and demand-driver detail will land here in an upcoming slice."
      />
    </>
  );
}
