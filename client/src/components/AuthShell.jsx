/** Centered card used by the login and register pages. */
export default function AuthShell({ title, subtitle, children, wide = false }) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-start justify-center bg-gradient-to-b from-blue-50 to-slate-50 px-4 py-12">
      <div className={`card w-full p-8 ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function PasswordToggle({ shown, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-blue-600 hover:text-blue-800"
    >
      {shown ? 'Hide' : 'Show'}
    </button>
  );
}
