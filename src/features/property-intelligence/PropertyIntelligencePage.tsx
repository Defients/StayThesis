import { Construction } from 'lucide-react';
import { useParams } from 'react-router';
import { useDocumentTitle } from '@/app/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function PropertyIntelligencePage() {
  useDocumentTitle('Property Intelligence — StayThesis');
  const { propertyId, tab } = useParams();
  return (
    <>
      <PageHeader
        index="04"
        title="Property Intelligence"
        description="Deep underwriting, compliance gates, evidence, and the decision record for a single property."
      />
      <EmptyState
        icon={Construction}
        title={
          propertyId
            ? `Property ${propertyId} is being built`
            : 'Property Intelligence is being built'
        }
        body={
          tab
            ? `The “${tab}” workspace arrives in an upcoming slice.`
            : 'Scenario underwriting, hard gates, and the decision log will land here in an upcoming slice.'
        }
      />
    </>
  );
}
