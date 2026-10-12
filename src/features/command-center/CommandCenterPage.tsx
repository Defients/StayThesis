import { Construction } from 'lucide-react';
import { useDocumentTitle } from '@/app/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function CommandCenterPage() {
  useDocumentTitle('Command Center — StayThesis');
  return (
    <>
      <PageHeader
        index="01"
        title="Command Center"
        description="Portfolio-level view of pipeline health, open gates, and the next actions that move deals forward."
      />
      <EmptyState
        icon={Construction}
        title="Command Center is being built"
        body="Pipeline health, hard-gate status, and partner activity will land here in an upcoming slice."
      />
    </>
  );
}
