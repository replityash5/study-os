import {
  BarChart3,
  Bookmark,
  BookOpen,
  CalendarDays,
  GraduationCap,
  House,
  LogIn,
  LogOut,
  Settings,
  MessageCircle,
  Target,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const items = [
  { to: '/workspace', label: 'Workspace', icon: House },
  { to: null, label: 'Syllabus', icon: BookOpen },
  { to: null, label: 'Calendar', icon: CalendarDays },
  { to: null, label: 'Messages', icon: MessageCircle },
  { to: '/practice', label: 'Practice', icon: Target },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { user, signIn, signOut } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [authError, setAuthError] = useState('');
  const initials = user?.displayName?.slice(0, 1).toUpperCase() || 'S';

  async function handleSignIn() {
    setAuthError('');
    setAccountOpen(false);
    try {
      await signIn();
    } catch {
      setAuthError('Sign-in was cancelled or unavailable.');
      setAccountOpen(true);
    }
  }

  return (
    <aside className="fixed bottom-4 left-4 top-4 z-20 flex w-[82px] flex-col items-center rounded-[28px] bg-white py-5 shadow-soft max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:top-auto max-md:h-[72px] max-md:w-auto max-md:flex-row max-md:justify-around max-md:rounded-none max-md:py-2">
      <div className="mb-7 rounded-[18px] bg-primary p-3 text-white shadow-soft-purple max-md:mb-0">
        <GraduationCap size={21} />
      </div>
      <nav className="flex flex-1 flex-col gap-3 max-md:flex-row max-md:flex-none">
        {items.map(({ to, label, icon: Icon }) =>
          to ? (
            <NavLink
              key={label}
              to={to}
              aria-label={label}
              className={({ isActive }) =>
                `rounded-[15px] p-3 transition ${
                  isActive
                    ? 'bg-white text-primary shadow-soft'
                    : 'text-slate-400 hover:bg-violet-50'
                }`
              }
            >
              <Icon size={20} />
              <span className="sr-only">{label}</span>
            </NavLink>
          ) : (
            <button
              key={label}
              type="button"
              aria-label={`${label} coming soon`}
              title="Coming in the next step"
              className="cursor-not-allowed rounded-[15px] p-3 text-slate-300"
            >
              <Icon size={20} />
              <span className="sr-only">{label}</span>
            </button>
          ),
        )}
      </nav>
      <div className="group relative max-md:hidden">
        <button
          aria-expanded={accountOpen}
          aria-label={user ? `Account for ${user.displayName ?? 'user'}` : 'Sign in'}
          onClick={() => setAccountOpen((open) => !open)}
          className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-violet-300 to-primary text-sm font-bold text-white shadow-soft"
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
          <span
            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
              user ? 'bg-emerald-400' : 'bg-slate-300'
            }`}
          />
        </button>
        {accountOpen && (
          <div className="absolute bottom-0 left-14 min-w-36 rounded-xl bg-white p-2 shadow-soft">
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false);
                  void signOut();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-violet-50"
              >
                <LogOut size={14} />
                Sign out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSignIn()}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-violet-50"
              >
                <LogIn size={14} />
                Sign in with Google
              </button>
            )}
            {authError && <p className="px-2 pb-1 text-[10px] text-amber-600">{authError}</p>}
          </div>
        )}
      </div>
    </aside>
  );
}
