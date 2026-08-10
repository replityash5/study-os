import { Sparkles } from 'lucide-react';
import { Card, EmptyState } from '../components/ui';

export function ComingSoonPage({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas pl-[114px] max-md:pb-24 max-md:pl-4">
      <Card className="mx-4 w-full max-w-xl p-10">
        <EmptyState
          icon={<Sparkles />}
          title={`${label} is coming soon`}
          description="This foundation is ready. We’ll add this workspace in a later step."
        />
      </Card>
    </div>
  );
}
