import { AnimatePresence, motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import { SyncStatus } from '../components/SyncStatus';
import { IconButton } from '../components/ui';
import { SyllabusExplorer } from '../components/syllabus/SyllabusExplorer';
import { WorkspacePanels } from '../components/workspace/WorkspacePanels';
import { useSyllabusStore } from '../store/syllabusStore';
import { useUIStore } from '../store/uiStore';

export function WorkspacePage() {
  const selectedTopic = useSyllabusStore((state) => state.selectedTopic);
  const drawerOpen = useUIStore((state) => state.drawerOpen);
  const setDrawerOpen = useUIStore((state) => state.setDrawerOpen);

  return (
    <div className="h-screen overflow-hidden bg-canvas pl-[114px] pr-8 pt-5 max-lg:h-auto max-lg:min-h-screen max-lg:overflow-visible max-md:pb-24 max-md:pl-4 max-md:pr-4">
      <main className="grid h-[calc(100vh-40px)] min-h-0 grid-cols-[minmax(300px,340px)_1fr] gap-5 max-lg:h-auto max-lg:grid-cols-1">
        <section className="h-full min-h-0 max-lg:hidden">
          <SyllabusExplorer />
        </section>
        <section className="h-full min-h-0 max-lg:h-auto">
          <div className="flex h-full min-h-0 flex-col gap-4 max-lg:h-auto">
            <div className="flex items-center justify-between lg:hidden">
              <IconButton label="Open syllabus explorer" onClick={() => setDrawerOpen(true)}>
                <Menu size={20} />
              </IconButton>
              <SyncStatus />
            </div>
            <WorkspacePanels topicId={selectedTopic ?? undefined} />
          </div>
        </section>
      </main>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.button
              aria-label="Close syllabus drawer"
              className="fixed inset-0 z-30 hidden bg-slate-900/20 max-lg:block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed bottom-0 left-0 top-0 z-40 block w-[min(92vw,420px)] p-4 max-lg:block lg:hidden"
            >
              <SyllabusExplorer onClose={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
