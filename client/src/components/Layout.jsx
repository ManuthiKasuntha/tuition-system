import { GraduationCap, LogOut, Menu, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { initials } from '../utils/format.js';

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className="text-lg font-bold text-slate-900">
        Tuition<span className="text-blue-600">Hub</span>
      </span>
    </Link>
  );
}

const navClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = user
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/classes', label: user.role === 'teacher' ? 'All Classes' : 'Find Classes' },
        { to: '/profile', label: 'Profile' },
      ]
    : [];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden items-center gap-1 md:flex">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} end className={navClass}>
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                {user.role === 'teacher' && (
                  <Link to="/classes/new" className="btn-primary py-2">
                    <Plus className="h-4 w-4" /> New class
                  </Link>
                )}
                <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {initials(user.fullName)}
                  </span>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold text-slate-900">{user.fullName}</p>
                    <p className="text-xs capitalize text-slate-500">{user.role}</p>
                  </div>
                  <button onClick={handleLogout} className="btn-ghost px-2.5" title="Log out" aria-label="Log out">
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">Log in</Link>
                <Link to="/register" className="btn-primary">Sign up</Link>
              </>
            )}
          </div>

          <button className="btn-ghost px-2 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden" onClick={() => setOpen(false)}>
            {user ? (
              <div className="flex flex-col gap-1">
                <p className="px-3 pb-2 text-sm text-slate-500">
                  Signed in as <span className="font-semibold text-slate-900">{user.fullName}</span> ({user.role})
                </p>
                {links.map((l) => (
                  <NavLink key={l.to} to={l.to} end className={navClass}>{l.label}</NavLink>
                ))}
                {user.role === 'teacher' && <NavLink to="/classes/new" className={navClass}>New class</NavLink>}
                <button onClick={handleLogout} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50">
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" className="btn-outline flex-1">Log in</Link>
                <Link to="/register" className="btn-primary flex-1">Sign up</Link>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} TuitionHub · Online tuition classes across Sri Lanka
      </footer>
    </div>
  );
}
