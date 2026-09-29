import {
  ArrowLeft, CalendarClock, CalendarPlus, Download, FileText, Languages, Lock, MapPin, Pencil, Trash2, Upload, Users,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage, fieldErrors } from '../api/client.js';
import SessionItem from '../components/SessionItem.jsx';
import { Alert, EmptyState, Field, PageLoader, Spinner } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate, formatFee, formatFileSize, hasEnded } from '../utils/format.js';

function SessionsTab({ cls, canSeeLinks }) {
  const [sessions, setSessions] = useState(null);
  const [form, setForm] = useState({ title: '', startTime: '', durationMinutes: 60, meetingLink: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.get(`/classes/${cls.id}/sessions`).then((r) => setSessions(r.data.sessions)).catch((e) => setError(errorMessage(e)));
  }, [cls.id]);
  useEffect(load, [load]);

  const onInput = (name) => (e) => {
    setForm((f) => ({ ...f, [name]: e.target.value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const addSession = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post(`/classes/${cls.id}/sessions`, {
        ...form,
        startTime: form.startTime ? new Date(form.startTime).toISOString() : '',
        durationMinutes: Number(form.durationMinutes),
      });
      setForm({ title: '', startTime: '', durationMinutes: 60, meetingLink: '' });
      setErrors({});
      load();
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s) => {
    if (!confirm(`Delete the session "${s.title}"?`)) return;
    try {
      await api.delete(`/sessions/${s.id}`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (!sessions) return error ? <Alert>{error}</Alert> : <PageLoader />;
  const upcoming = sessions.filter((s) => !hasEnded(s)).reverse();
  const past = sessions.filter(hasEnded);

  return (
    <div className="space-y-6">
      {cls.isOwner && (
        <form onSubmit={addSession} className="card space-y-4 p-5" noValidate>
          <h3 className="flex items-center gap-2 font-semibold text-slate-900"><CalendarPlus className="h-5 w-5 text-blue-600" /> Schedule an online session</h3>
          <Alert>{error}</Alert>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Session title" htmlFor="s-title" error={errors.title}>
              <input id="s-title" className={`input ${errors.title ? 'input-error' : ''}`} value={form.title} onChange={onInput('title')} placeholder="e.g. Algebra - Lesson 3" />
            </Field>
            <Field label="Meeting link" htmlFor="s-link" error={errors.meetingLink} hint="Zoom, Google Meet or Teams link">
              <input id="s-link" className={`input ${errors.meetingLink ? 'input-error' : ''}`} value={form.meetingLink} onChange={onInput('meetingLink')} placeholder="https://meet.google.com/..." />
            </Field>
            <Field label="Date & time" htmlFor="s-start" error={errors.startTime}>
              <input id="s-start" type="datetime-local" className={`input ${errors.startTime ? 'input-error' : ''}`} value={form.startTime} onChange={onInput('startTime')} />
            </Field>
            <Field label="Duration (minutes)" htmlFor="s-dur" error={errors.durationMinutes}>
              <input id="s-dur" type="number" min="15" max="600" step="15" className={`input ${errors.durationMinutes ? 'input-error' : ''}`} value={form.durationMinutes} onChange={onInput('durationMinutes')} />
            </Field>
          </div>
          <div className="flex justify-end">
            <button className="btn-primary" disabled={saving}>{saving && <Spinner className="h-4 w-4" />} Add session</button>
          </div>
        </form>
      )}
      {!cls.isOwner && error && <Alert>{error}</Alert>}

      {!canSeeLinks && sessions.length > 0 && (
        <p className="flex items-center gap-2 text-sm text-slate-500"><Lock className="h-4 w-4" /> Enroll in this class to get the join links.</p>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Upcoming</h3>
        {upcoming.length ? (
          <div className="space-y-3">
            {upcoming.map((s) => <SessionItem key={s.id} session={s} onDelete={cls.isOwner ? remove : undefined} />)}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No upcoming sessions.</p>
        )}
      </div>
      {past.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Past sessions</h3>
          <div className="space-y-3">
            {past.map((s) => <SessionItem key={s.id} session={s} onDelete={cls.isOwner ? remove : undefined} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function MaterialsTab({ cls }) {
  const [materials, setMaterials] = useState(null);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInput = useRef(null);

  const load = useCallback(() => {
    api.get(`/classes/${cls.id}/materials`).then((r) => setMaterials(r.data.materials)).catch((e) => setError(errorMessage(e)));
  }, [cls.id]);
  useEffect(load, [load]);

  const uploadFile = async (e) => {
    e.preventDefault();
    if (!file) return setError('Choose a file to upload');
    const body = new FormData();
    body.append('title', title);
    body.append('file', file);
    setUploading(true);
    setError('');
    try {
      await api.post(`/classes/${cls.id}/materials`, body, {
        onUploadProgress: (p) => setProgress(p.total ? Math.round((p.loaded / p.total) * 100) : 0),
      });
      setTitle('');
      setFile(null);
      fileInput.current.value = '';
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const download = async (m) => {
    try {
      const res = await api.get(`/materials/${m.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = Object.assign(document.createElement('a'), { href: url, download: m.fileName });
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errorMessage(err, 'Could not download the file'));
    }
  };

  const remove = async (m) => {
    if (!confirm(`Delete "${m.title}"?`)) return;
    try {
      await api.delete(`/materials/${m.id}`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (!materials) return error ? <Alert>{error}</Alert> : <PageLoader />;

  return (
    <div className="space-y-6">
      {cls.isOwner && (
        <form onSubmit={uploadFile} className="card space-y-4 p-5" noValidate>
          <h3 className="flex items-center gap-2 font-semibold text-slate-900"><Upload className="h-5 w-5 text-blue-600" /> Upload lecture material</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title (optional)" htmlFor="m-title">
              <input id="m-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lesson 3 notes" />
            </Field>
            <Field label="File" htmlFor="m-file" hint="PDF, Word, PowerPoint, Excel, images, ZIP, MP3/MP4 · max 50 MB">
              <input id="m-file" ref={fileInput} type="file" onChange={(e) => setFile(e.target.files[0] ?? null)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100" />
            </Field>
          </div>
          {uploading && (
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          <div className="flex justify-end">
            <button className="btn-primary" disabled={uploading}>{uploading && <Spinner className="h-4 w-4" />} Upload</button>
          </div>
        </form>
      )}
      <Alert>{error}</Alert>

      {materials.length ? (
        <div className="card divide-y divide-slate-100">
          {materials.map((m) => (
            <div key={m.id} className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{m.title}</p>
                <p className="truncate text-xs text-slate-500">{m.fileName} · {formatFileSize(m.sizeBytes)} · {formatDate(m.uploadedAt)}</p>
              </div>
              <button onClick={() => download(m)} className="btn-outline px-3 py-2"><Download className="h-4 w-4" /> <span className="hidden sm:inline">Download</span></button>
              {cls.isOwner && (
                <button onClick={() => remove(m)} className="btn-ghost px-2.5 text-slate-400 hover:text-red-600" aria-label="Delete material">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No materials uploaded yet.</p>
      )}
    </div>
  );
}

function StudentsTab({ cls }) {
  const [students, setStudents] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get(`/classes/${cls.id}/students`).then((r) => setStudents(r.data.students)).catch((e) => setError(errorMessage(e)));
  }, [cls.id]);

  if (error) return <Alert>{error}</Alert>;
  if (!students) return <PageLoader />;
  if (!students.length) return <p className="text-sm text-slate-500">No students have enrolled yet.</p>;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Email</th>
            <th className="px-4 py-3 font-semibold">Grade</th>
            <th className="px-4 py-3 font-semibold">District</th>
            <th className="px-4 py-3 font-semibold">Enrolled</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {students.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3"><p className="font-medium text-slate-900">{s.fullName}</p><p className="text-xs text-slate-500">@{s.username}</p></td>
              <td className="px-4 py-3 text-slate-600">{s.email}</td>
              <td className="px-4 py-3 text-slate-600">{s.currentGrade}</td>
              <td className="px-4 py-3 text-slate-600">{s.district}</td>
              <td className="px-4 py-3 text-slate-600">{formatDate(s.enrolledAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ClassDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cls, setCls] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('sessions');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    return api.get(`/classes/${id}`).then((r) => setCls(r.data.class)).catch((e) => setError(errorMessage(e)));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const toggleEnroll = async () => {
    if (cls.isEnrolled && !confirm('Leave this class? You will lose access to its sessions and materials.')) return;
    setBusy(true);
    try {
      if (cls.isEnrolled) await api.delete(`/classes/${id}/enroll`);
      else await api.post(`/classes/${id}/enroll`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const deleteClass = async () => {
    if (!confirm(`Delete "${cls.title}"? This removes all its sessions, materials and enrollments.`)) return;
    try {
      await api.delete(`/classes/${id}`);
      navigate('/dashboard');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (!cls) return error ? <div className="mx-auto max-w-5xl px-4 py-10"><Alert>{error}</Alert></div> : <PageLoader />;

  const isMember = cls.isOwner || cls.isEnrolled;
  const tabs = [
    { key: 'sessions', label: 'Online sessions' },
    { key: 'materials', label: 'Materials' },
    ...(cls.isOwner ? [{ key: 'students', label: `Students (${cls.studentCount})` }] : []),
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link to={user.role === 'teacher' ? '/dashboard' : '/classes'} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-7 text-white">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium">{cls.subject}</span>
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium">{cls.grade}</span>
            {cls.isEnrolled && <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-blue-700">Enrolled</span>}
          </div>
          <h1 className="text-2xl font-bold md:text-3xl">{cls.title}</h1>
          <p className="mt-1 text-blue-100">by {cls.teacherName}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            {cls.schedule && <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4 text-blue-500" /> {cls.schedule}</span>}
            <span className="flex items-center gap-1.5"><Languages className="h-4 w-4 text-blue-500" /> {cls.medium} medium</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-blue-500" /> {cls.teacherDistrict}</span>
            <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-blue-500" /> {cls.studentCount} students</span>
            <span className="font-semibold text-blue-700">{formatFee(cls.fee)}</span>
          </div>
          <div className="flex gap-2">
            {cls.isOwner ? (
              <>
                <Link to={`/classes/${cls.id}/edit`} className="btn-outline"><Pencil className="h-4 w-4" /> Edit</Link>
                <button onClick={deleteClass} className="btn-danger"><Trash2 className="h-4 w-4" /> Delete</button>
              </>
            ) : user.role === 'student' ? (
              <button onClick={toggleEnroll} disabled={busy} className={cls.isEnrolled ? 'btn-danger' : 'btn-primary px-6'}>
                {busy && <Spinner className="h-4 w-4" />} {cls.isEnrolled ? 'Leave class' : 'Enroll now'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {error && <div className="mt-4"><Alert>{error}</Alert></div>}

      {(cls.description || cls.teacherBio) && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {cls.description && (
            <div className="card p-6">
              <h2 className="mb-2 font-semibold text-slate-900">About this class</h2>
              <p className="whitespace-pre-line text-sm text-slate-600">{cls.description}</p>
            </div>
          )}
          {cls.teacherBio && (
            <div className="card p-6">
              <h2 className="mb-2 font-semibold text-slate-900">About the teacher</h2>
              <p className="whitespace-pre-line text-sm text-slate-600">{cls.teacherBio}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'sessions' && <SessionsTab cls={cls} canSeeLinks={isMember} />}
        {tab === 'materials' &&
          (isMember ? (
            <MaterialsTab cls={cls} />
          ) : (
            <EmptyState icon={Lock} title="Materials are for enrolled students" text="Enroll in this class to download its lecture materials." />
          ))}
        {tab === 'students' && cls.isOwner && <StudentsTab cls={cls} />}
      </div>
    </div>
  );
}
