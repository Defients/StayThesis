import { Construction } from 'lucide-react';
import { useDocumentTitle } from '@/app/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function CrmPage() {
  useDocumentTitle('Acquisition CRM — StayThesis');
  return (
    <>
      <PageHeader
        index="05"
        title="Acquisition CRM"
        description="The acquisition pipeline — stages, tasks, approvals, notes, and outreach drafts across both partners."
      />
      <EmptyState
        icon={Construction}
        title="Acquisition CRM is being built"
        body="The pipeline board, task list, and approval flow will land here in an upcoming slice."
      />
    </>
  );
}
