import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage, fieldErrors, getMeta } from '../api/client.js';
import { Alert, Field, PageLoader, Spinner } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const EMPTY = { title: '', subject: '', grade: '', medium: '', schedule: '', fee: '', description: '' };

export default function ClassForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMeta().then(setMeta).catch((err) => setError(errorMessage(err)));
    if (!isEdit) return;
    api
      .get(`/classes/${id}`)
      .then(({ data }) => {
        if (!data.class.isOwner) return navigate(`/classes/${id}`, { replace: true });
        const c = data.class;
        setForm({ title: c.title, subject: c.subject, grade: c.grade, medium: c.medium, schedule: c.schedule ?? '', fee: String(c.fee), description: c.description ?? '' });
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  const onInput = (name) => (e) => {
    setForm((f) => ({ ...f, [name]: e.target.value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = isEdit ? await api.put(`/classes/${id}`, form) : await api.post('/classes', form);
      navigate(`/classes/${data.class.id}`);
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  if (loading || !meta) return error ? <div className="mx-auto max-w-2xl px-4 py-10"><Alert>{error}</Alert></div> : <PageLoader />;

  // Show the teacher's own subjects and grades first
  const subjects = [...user.subjects, ...meta.subjects.filter((s) => !user.subjects.includes(s))];
  const cls = (name) => `input ${errors[name] ? 'input-error' : ''}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to={isEdit ? `/classes/${id}` : '/dashboard'} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit class' : 'Create a new class'}</h1>
        <p className="mt-1 text-sm text-slate-500">Students will see these details when they search for classes.</p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
          <Alert>{error}</Alert>
          <Field label="Class title" htmlFor="title" error={errors.title}>
            <input id="title" className={cls('title')} value={form.title} onChange={onInput('title')} placeholder="e.g. O/L Maths Theory 2027" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Subject" htmlFor="subject" error={errors.subject}>
              <select id="subject" className={cls('subject')} value={form.subject} onChange={onInput('subject')}>
                <option value="">Select</option>
                {subjects.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Grade" htmlFor="grade" error={errors.grade}>
              <select id="grade" className={cls('grade')} value={form.grade} onChange={onInput('grade')}>
                <option value="">Select</option>
                {meta.grades.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.value} (Age {g.age}){user.grades.includes(g.value) ? ' ★' : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Medium" htmlFor="medium" error={errors.medium}>
              <select id="medium" className={cls('medium')} value={form.medium} onChange={onInput('medium')}>
                <option value="">Select</option>
                {meta.mediums.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Schedule" htmlFor="schedule" error={errors.schedule} hint="When the class usually runs">
              <input id="schedule" className={cls('schedule')} value={form.schedule} onChange={onInput('schedule')} placeholder="Every Saturday 8.00 - 10.00 AM" />
            </Field>
            <Field label="Monthly fee (Rs.)" htmlFor="fee" error={errors.fee} hint="Use 0 for a free class">
              <input id="fee" type="number" min="0" step="50" className={cls('fee')} value={form.fee} onChange={onInput('fee')} placeholder="2500" />
            </Field>
          </div>
          <Field label="Description" htmlFor="description" error={errors.description}>
            <textarea id="description" rows={5} className={cls('description')} value={form.description} onChange={onInput('description')} placeholder="What will students learn? What do they need?" maxLength={2000} />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Link to={isEdit ? `/classes/${id}` : '/dashboard'} className="btn-ghost">Cancel</Link>
            <button type="submit" className="btn-primary px-6" disabled={saving}>
              {saving && <Spinner className="h-4 w-4" />} {isEdit ? 'Save changes' : 'Create class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
