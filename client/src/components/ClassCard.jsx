import { CalendarClock, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatFee } from '../utils/format.js';

export default function ClassCard({ cls }) {
  return (
    <Link
      to={`/classes/${cls.id}`}
      className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="badge">{cls.subject}</span>
        <span className="badge bg-slate-100 text-slate-600">{cls.grade}</span>
        <span className="badge bg-slate-100 text-slate-600">{cls.medium}</span>
        {cls.isEnrolled && <span className="badge bg-green-50 text-green-700">Enrolled</span>}
      </div>
      <h3 className="font-semibold text-slate-900 group-hover:text-blue-700">{cls.title}</h3>
      <p className="mt-1 text-sm text-slate-500">by {cls.teacherName}</p>

      <div className="mt-4 space-y-1.5 text-sm text-slate-600">
        {cls.schedule && (
          <p className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-blue-500" /> {cls.schedule}
          </p>
        )}
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-500" /> {cls.teacherDistrict}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
        <span className="font-semibold text-blue-700">{formatFee(cls.fee)}</span>
        <span className="flex items-center gap-1.5 text-slate-500">
          <Users className="h-4 w-4" /> {cls.studentCount}
        </span>
      </div>
    </Link>
  );
}
