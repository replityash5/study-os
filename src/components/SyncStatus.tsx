import { useAuth } from '../auth/useAuth';
import { useCloudStore } from '../store/cloudStore';

export function SyncStatus() {
  const { user } = useAuth();
  const offline = useCloudStore((state) => state.offline);

  return (
    <span className="whitespace-nowrap rounded-full bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 shadow-soft">
      {user ? (offline ? 'Offline — saving locally' : 'Sync enabled') : 'Local mode'}
    </span>
  );
}
