import { ArrowRight, BookOpen, FileText, GraduationCap, MonitorPlay, Search, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  { icon: MonitorPlay, title: 'Live online classes', text: 'Join Zoom or Google Meet sessions straight from your dashboard.' },
  { icon: FileText, title: 'Lecture materials', text: 'Teachers upload notes, slides and past papers for their students.' },
  { icon: Search, title: 'Find the right class', text: 'Search by subject, grade and district, anywhere on the island.' },
  { icon: Users, title: 'Manage your students', text: 'Teachers see who enrolled and keep every class organised.' },
];

export default function Landing() {
  return (
    <div>
      <section className="bg-gradient-to-b from-blue-50 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2">
          <div>
            <span className="badge mb-5 bg-white px-3 py-1 shadow-sm">Island-wide online tuition</span>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Learn from the best tuition teachers in <span className="text-blue-600">Sri Lanka</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-slate-600">
              TuitionHub brings students and teachers together. Teachers run their classes online, and
              students join from anywhere.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register?role=student" className="btn-primary px-6 py-3 text-base">
                <GraduationCap className="h-5 w-5" /> Join as a student
              </Link>
              <Link to="/register?role=teacher" className="btn-outline px-6 py-3 text-base">
                <BookOpen className="h-5 w-5" /> Join as a teacher
              </Link>
            </div>
            <p className="mt-5 text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-blue-600 hover:underline">Log in</Link>
            </p>
          </div>

          <div className="relative hidden md:block">
            <div className="absolute -inset-4 rounded-3xl bg-blue-600/10 blur-2xl" />
            <div className="card relative space-y-4 p-6">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">Upcoming classes</p>
                <span className="badge">Today</span>
              </div>
              {[
                ['Combined Maths', 'A/L 2027 · Grade 12', '6.00 PM'],
                ['Science', 'O/L Revision · Grade 11', '7.30 PM'],
                ['English', 'Spoken English · Grade 8', '8.00 PM'],
              ].map(([subject, detail, time]) => (
                <div key={subject} className="flex items-center gap-4 rounded-xl border border-slate-100 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <MonitorPlay className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{subject}</p>
                    <p className="text-sm text-slate-500">{detail}</p>
                  </div>
                  <span className="text-sm font-semibold text-blue-700">{time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-slate-900">Everything a tuition class needs</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link to="/register" className="btn-primary px-6 py-3">
            Create your free account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
