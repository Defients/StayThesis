import { Construction } from 'lucide-react';
import { useDocumentTitle } from '@/app/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function PropertiesPage() {
  useDocumentTitle('Property Explorer — StayThesis');
  return (
    <>
      <PageHeader
        index="03"
        title="Property Explorer"
        description="Screen candidate units against the thesis — rent, ratings, archetypes, and quick underwriting signals."
      />
      <EmptyState
        icon={Construction}
        title="Property Explorer is being built"
        body="Searchable property cards and screening signals will land here in an upcoming slice."
      />
    </>
  );
}
