import { Clock, Trash2, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDateTime, hasEnded, isLive } from '../utils/format.js';

export default function SessionItem({ session, showClass = false, onDelete }) {
  const live = isLive(session);
  const ended = hasEnded(session);
  const date = new Date(session.startTime);

  return (
    <div className={`flex items-center gap-4 rounded-xl border p-4 ${live ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 bg-white'} ${ended ? 'opacity-60' : ''}`}>
      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-600 text-white">
        <span className="text-xs font-medium uppercase">{date.toLocaleDateString('en-LK', { month: 'short' })}</span>
        <span className="text-lg font-bold leading-none">{date.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">{session.title}</p>
        {showClass && (
          <Link to={`/classes/${session.classId}`} className="block truncate text-sm text-blue-600 hover:underline">
            {session.classTitle}
          </Link>
        )}
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
          <Clock className="h-3.5 w-3.5" /> {formatDateTime(session.startTime)} · {session.durationMinutes} min
          {live && <span className="badge ml-1 bg-red-50 text-red-600">Live now</span>}
          {ended && <span className="ml-1 text-xs">(ended)</span>}
        </p>
      </div>
      {session.meetingLink && !ended && (
        <a href={session.meetingLink} target="_blank" rel="noreferrer" className={live ? 'btn-primary' : 'btn-outline'}>
          <Video className="h-4 w-4" /> Join
        </a>
      )}
      {onDelete && (
        <button onClick={() => onDelete(session)} className="btn-ghost px-2.5 text-slate-400 hover:text-red-600" aria-label="Delete session">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
