import { BookOpen, CalendarDays, Plus, Search, Sparkles, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api/client.js';
import ClassCard from '../components/ClassCard.jsx';
import SessionItem from '../components/SessionItem.jsx';
import { Alert, EmptyState, PageLoader, StatCard } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const { user } = useAuth();
  const isTeacher = user.role === 'teacher';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/classes/mine'),
      api.get('/sessions/upcoming'),
      isTeacher ? Promise.resolve({ data: { classes: [] } }) : api.get('/classes/recommended'),
    ])
      .then(([mine, upcoming, rec]) =>
        setData({ classes: mine.data.classes, sessions: upcoming.data.sessions, recommended: rec.data.classes })
      )
      .catch((err) => setError(errorMessage(err)));
  }, [isTeacher]);

  if (error) return <div className="mx-auto max-w-6xl px-4 py-10"><Alert>{error}</Alert></div>;
  if (!data) return <PageLoader />;

  const totalStudents = data.classes.reduce((sum, c) => sum + c.studentCount, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 p-7 text-white shadow-sm">
        <div>
          <p className="text-blue-100">{greeting()},</p>
          <h1 className="text-2xl font-bold">{user.fullName}</h1>
          <p className="mt-1 text-sm text-blue-100">
            {isTeacher
              ? `Teaching ${user.subjects.join(', ')}`
              : `${user.currentGrade} student · ${user.district}`}
          </p>
        </div>
        {isTeacher ? (
          <Link to="/classes/new" className="btn-outline border-0">
            <Plus className="h-4 w-4" /> Create a class
          </Link>
        ) : (
          <Link to="/classes" className="btn-outline border-0 text-blue-700">
            <Search className="h-4 w-4" /> Find classes
          </Link>
        )}
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <StatCard icon={BookOpen} label={isTeacher ? 'My classes' : 'Enrolled classes'} value={data.classes.length} />
        <StatCard icon={CalendarDays} label="Upcoming sessions" value={data.sessions.length} />
        {isTeacher ? (
          <StatCard icon={Users} label="Total students" value={totalStudents} />
        ) : (
          <StatCard icon={Sparkles} label="Subjects I follow" value={user.subjects.length} />
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">{isTeacher ? 'My classes' : 'My enrolled classes'}</h2>
          {data.classes.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {data.classes.map((c) => <ClassCard key={c.id} cls={c} />)}
            </div>
          ) : isTeacher ? (
            <EmptyState
              icon={BookOpen}
              title="You have no classes yet"
              text="Create your first class so students across the island can find and join it."
              action={<Link to="/classes/new" className="btn-primary"><Plus className="h-4 w-4" /> Create a class</Link>}
            />
          ) : (
            <EmptyState
              icon={Search}
              title="You haven't joined any classes"
              text="Browse classes by subject, grade and district to get started."
              action={<Link to="/classes" className="btn-primary"><Search className="h-4 w-4" /> Find classes</Link>}
            />
          )}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Upcoming sessions</h2>
          {data.sessions.length ? (
            <div className="space-y-3">
              {data.sessions.map((s) => <SessionItem key={s.id} session={s} showClass />)}
            </div>
          ) : (
            <div className="card p-6 text-center text-sm text-slate-500">
              {isTeacher ? 'Schedule a session from one of your classes.' : 'No sessions scheduled in your classes yet.'}
            </div>
          )}
        </section>
      </div>

      {!isTeacher && data.recommended.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Recommended for you</h2>
          <p className="mb-4 text-sm text-slate-500">Classes for {user.currentGrade} in the subjects you follow</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.recommended.map((c) => <ClassCard key={c.id} cls={c} />)}
          </div>
        </section>
      )}
    </div>
  );
}
