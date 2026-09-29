import { useAuth } from '../context/AuthContext.jsx';
import { formatDate, initials } from '../utils/format.js';

function Row({ label, children }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-4 last:border-0 sm:grid-cols-3">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900 sm:col-span-2">{children}</dd>
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-600 to-blue-400" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex items-end gap-4">
            <span className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-blue-100 text-2xl font-bold text-blue-700">
              {initials(user.fullName)}
            </span>
            <div className="pb-1">
              <h1 className="text-xl font-bold text-slate-900">{user.fullName}</h1>
              <p className="text-sm text-slate-500">@{user.username} · <span className="capitalize">{user.role}</span></p>
            </div>
          </div>

          <dl className="mt-6">
            <Row label="Email">{user.email}</Row>
            <Row label="District">{user.district}</Row>
            {user.role === 'student' && <Row label="Current grade">{user.currentGrade}</Row>}
            <Row label={user.role === 'teacher' ? 'Subjects taught' : 'Subjects'}>
              <div className="flex flex-wrap gap-1.5">
                {user.subjects.map((s) => <span key={s} className="badge">{s}</span>)}
              </div>
            </Row>
            {user.role === 'teacher' && (
              <>
                <Row label="Grades covered">
                  <div className="flex flex-wrap gap-1.5">
                    {user.grades.map((g) => <span key={g} className="badge bg-slate-100 text-slate-700">{g}</span>)}
                  </div>
                </Row>
                {user.bio && <Row label="Bio">{user.bio}</Row>}
              </>
            )}
            <Row label="Member since">{formatDate(user.createdAt)}</Row>
          </dl>
        </div>
      </div>
    </div>
  );
}
