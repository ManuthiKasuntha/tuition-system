import { ArrowLeft, ArrowRight, BookOpen, Check, GraduationCap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { errorMessage, fieldErrors, getMeta } from '../api/client.js';
import AuthShell, { PasswordToggle } from '../components/AuthShell.jsx';
import { Alert, ChipSelect, Field, PageLoader, Spinner } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const STEPS = ['Account', 'I am a...', 'Subjects & grades'];
const STEP_FIELDS = [
  ['fullName', 'username', 'email', 'password', 'confirmPassword'],
  ['role'],
  ['subjects', 'grades', 'currentGrade', 'district', 'bio'],
];
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateStep(step, f) {
  const e = {};
  if (step === 0) {
    if (f.fullName.trim().length < 2) e.fullName = 'Enter your full name';
    if (!USERNAME_RE.test(f.username.trim())) e.username = '3-30 characters: letters, numbers or _';
    if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email address';
    if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) {
      e.password = 'At least 8 characters with a letter and a number';
    }
    if (f.confirmPassword !== f.password) e.confirmPassword = 'Passwords do not match';
  }
  if (step === 1 && !f.role) e.role = 'Choose one to continue';
  if (step === 2) {
    if (!f.subjects.length) e.subjects = f.role === 'teacher' ? 'Choose the subjects you teach' : 'Choose at least one subject';
    if (f.role === 'teacher' && !f.grades.length) e.grades = 'Choose the grades (age groups) you teach';
    if (f.role === 'student' && !f.currentGrade) e.currentGrade = 'Choose your current grade';
    if (!f.district) e.district = 'Choose your district';
  }
  return e;
}

function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score++;
  return score;
}

const ROLE_OPTIONS = [
  { value: 'student', icon: GraduationCap, title: 'Student', text: 'I want to find and join tuition classes' },
  { value: 'teacher', icon: BookOpen, title: 'Teacher', text: 'I want to run my tuition classes online' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [meta, setMeta] = useState(null);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: ['student', 'teacher'].includes(params.get('role')) ? params.get('role') : '',
    subjects: [],
    grades: [],
    currentGrade: '',
    district: '',
    bio: '',
  });

  useEffect(() => {
    getMeta().then(setMeta).catch((err) => setServerError(errorMessage(err)));
  }, []);

  const gradesByLevel = useMemo(() => {
    const groups = {};
    for (const g of meta?.grades ?? []) (groups[g.level] ??= []).push(g);
    return Object.entries(groups);
  }, [meta]);

  const set = (name) => (value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };
  const onInput = (name) => (e) => set(name)(e.target.value);

  const next = () => {
    const e = validateStep(step, form);
    setErrors(e);
    if (!Object.keys(e).length) setStep((s) => s + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 2) return next();
    const stepErrors = validateStep(2, form);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length) return;

    setSubmitting(true);
    setServerError('');
    try {
      const { confirmPassword, ...data } = form;
      await register(data);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      setServerError(errorMessage(err));
      // Jump back to the first step that has a problem (e.g. username already taken)
      const badStep = STEP_FIELDS.findIndex((fields) => fields.some((f) => fe[f]));
      if (badStep !== -1) setStep(badStep);
      setSubmitting(false);
    }
  };

  const toggleLevel = (grades) => {
    const values = grades.map((g) => g.value);
    const allSelected = values.every((v) => form.grades.includes(v));
    set('grades')(allSelected ? form.grades.filter((g) => !values.includes(g)) : [...new Set([...form.grades, ...values])]);
  };

  if (!meta && !serverError) return <PageLoader />;
  const strength = passwordStrength(form.password);

  return (
    <AuthShell title="Create your account" subtitle="Join TuitionHub in three quick steps" wide>
      {/* Stepper */}
      <ol className="mb-8 flex items-center">
        {STEPS.map((label, i) => (
          <li key={label} className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  i < step ? 'bg-blue-600 text-white' : i === step ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={`hidden text-sm font-medium sm:block ${i <= step ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`mx-3 h-0.5 flex-1 rounded ${i < step ? 'bg-blue-600' : 'bg-slate-200'}`} />}
          </li>
        ))}
      </ol>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Alert>{serverError}</Alert>

        {step === 0 && (
          <>
            <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
              <input id="fullName" className={`input ${errors.fullName ? 'input-error' : ''}`} value={form.fullName} onChange={onInput('fullName')} autoComplete="name" placeholder="e.g. Kavindi Silva" autoFocus />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Username" htmlFor="username" error={errors.username}>
                <input id="username" className={`input ${errors.username ? 'input-error' : ''}`} value={form.username} onChange={onInput('username')} autoComplete="username" placeholder="e.g. kavindi_s" />
              </Field>
              <Field label="Email" htmlFor="email" error={errors.email}>
                <input id="email" type="email" className={`input ${errors.email ? 'input-error' : ''}`} value={form.email} onChange={onInput('email')} autoComplete="email" placeholder="you@example.com" />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Password" htmlFor="password" error={errors.password}>
                <div className="relative">
                  <input id="password" type={showPassword ? 'text' : 'password'} className={`input pr-16 ${errors.password ? 'input-error' : ''}`} value={form.password} onChange={onInput('password')} autoComplete="new-password" placeholder="At least 8 characters" />
                  <PasswordToggle shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />
                </div>
                {form.password && (
                  <div className="mt-2 flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className={`h-1 flex-1 rounded ${i < strength ? (strength <= 1 ? 'bg-red-400' : strength <= 2 ? 'bg-amber-400' : 'bg-blue-600') : 'bg-slate-200'}`} />
                    ))}
                  </div>
                )}
              </Field>
              <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword}>
                <input id="confirmPassword" type={showPassword ? 'text' : 'password'} className={`input ${errors.confirmPassword ? 'input-error' : ''}`} value={form.confirmPassword} onChange={onInput('confirmPassword')} autoComplete="new-password" placeholder="Type it again" />
              </Field>
            </div>
          </>
        )}

        {step === 1 && (
          <div>
            <p className="mb-4 text-center text-sm text-slate-600">Are you a student or a teacher?</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {ROLE_OPTIONS.map(({ value, icon: Icon, title, text }) => {
                const active = form.role === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('role')(value)}
                    aria-pressed={active}
                    className={`relative rounded-2xl border-2 p-6 text-left transition ${
                      active ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    {active && (
                      <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                    <span className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${active ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                      <Icon className="h-6 w-6" />
                    </span>
                    <p className="text-lg font-semibold text-slate-900">{title}</p>
                    <p className="mt-1 text-sm text-slate-500">{text}</p>
                  </button>
                );
              })}
            </div>
            {errors.role && <p className="mt-3 text-center text-xs font-medium text-red-600">{errors.role}</p>}
          </div>
        )}

        {step === 2 && meta && (
          <>
            <Field
              label={form.role === 'teacher' ? 'Subjects you teach' : 'Subjects you are interested in'}
              error={errors.subjects}
              hint={`${form.subjects.length} selected`}
            >
              <ChipSelect options={meta.subjects} value={form.subjects} onChange={set('subjects')} />
            </Field>

            {form.role === 'teacher' ? (
              <Field label="Grades / age groups you cover" error={errors.grades} hint="Click a level name to select all its grades">
                <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                  {gradesByLevel.map(([level, grades]) => (
                    <div key={level}>
                      <button type="button" onClick={() => toggleLevel(grades)} className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700 hover:underline">
                        {level}
                      </button>
                      <ChipSelect
                        options={grades}
                        value={form.grades}
                        onChange={set('grades')}
                        getValue={(g) => g.value}
                        getLabel={(g) => `${g.value} · Age ${g.age}`}
                      />
                    </div>
                  ))}
                </div>
              </Field>
            ) : (
              <Field label="Your current grade" htmlFor="currentGrade" error={errors.currentGrade}>
                <select id="currentGrade" className={`input ${errors.currentGrade ? 'input-error' : ''}`} value={form.currentGrade} onChange={onInput('currentGrade')}>
                  <option value="">Select your grade</option>
                  {meta.grades.map((g) => (
                    <option key={g.value} value={g.value}>{g.value} (Age {g.age}) - {g.level}</option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="District" htmlFor="district" error={errors.district}>
              <select id="district" className={`input ${errors.district ? 'input-error' : ''}`} value={form.district} onChange={onInput('district')}>
                <option value="">Select your district</option>
                {meta.districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>

            {form.role === 'teacher' && (
              <Field label="Short bio (optional)" htmlFor="bio" error={errors.bio}>
                <textarea id="bio" rows={3} className="input" value={form.bio} onChange={onInput('bio')} placeholder="Your qualifications and teaching experience" maxLength={1000} />
              </Field>
            )}
          </>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          {step > 0 ? (
            <button type="button" className="btn-ghost" onClick={() => setStep((s) => s - 1)} disabled={submitting}>
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <button type="submit" className="btn-primary px-6">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="submit" className="btn-primary px-6" disabled={submitting || !meta}>
              {submitting && <Spinner className="h-4 w-4" />} Create account
            </button>
          )}
        </div>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-blue-600 hover:underline">Log in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
