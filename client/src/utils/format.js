export function formatDateTime(value) {
  return new Date(value).toLocaleString('en-LK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatFee(fee) {
  return fee > 0 ? `Rs. ${fee.toLocaleString('en-LK')} / month` : 'Free';
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Is the session happening now (or starting within 15 minutes)? */
export function isLive(session) {
  const start = new Date(session.startTime).getTime();
  const end = start + session.durationMinutes * 60 * 1000;
  const now = Date.now();
  return now >= start - 15 * 60 * 1000 && now <= end;
}

export function hasEnded(session) {
  return new Date(session.startTime).getTime() + session.durationMinutes * 60 * 1000 < Date.now();
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}
