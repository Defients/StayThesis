import { Link } from 'react-router';
import { Compass } from 'lucide-react';
import { useDocumentTitle } from './useDocumentTitle';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  useDocumentTitle('Not found — StayThesis');
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      body="That route doesn't exist in this workspace."
      action={
        <Link to="/">
          <Button variant="secondary">Back to Command Center</Button>
        </Link>
      }
    />
  );
}
