import { Search, SearchX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, errorMessage, getMeta } from '../api/client.js';
import ClassCard from '../components/ClassCard.jsx';
import { Alert, EmptyState, PageLoader } from '../components/ui.jsx';

const FILTERS = ['search', 'subject', 'grade', 'district'];

export default function BrowseClasses() {
  const [params, setParams] = useSearchParams();
  const [meta, setMeta] = useState(null);
  const [classes, setClasses] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(params.get('search') ?? '');

  useEffect(() => {
    getMeta().then(setMeta).catch((err) => setError(errorMessage(err)));
  }, []);

  useEffect(() => {
    const query = Object.fromEntries(FILTERS.filter((k) => params.get(k)).map((k) => [k, params.get(k)]));
    setClasses(null);
    api
      .get('/classes', { params: query })
      .then((res) => setClasses(res.data.classes))
      .catch((err) => setError(errorMessage(err)));
  }, [params]);

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => updateFilter('search', search.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function updateFilter(key, value) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  }

  const hasFilters = FILTERS.some((k) => params.get(k));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Find classes</h1>
      <p className="mt-1 text-sm text-slate-500">Tuition classes from teachers across Sri Lanka</p>

      <div className="card mt-6 grid gap-3 p-4 md:grid-cols-4">
        <div className="relative md:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search class or teacher" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input" value={params.get('subject') ?? ''} onChange={(e) => updateFilter('subject', e.target.value)}>
          <option value="">All subjects</option>
          {meta?.subjects.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="input" value={params.get('grade') ?? ''} onChange={(e) => updateFilter('grade', e.target.value)}>
          <option value="">All grades</option>
          {meta?.grades.map((g) => <option key={g.value} value={g.value}>{g.value} (Age {g.age})</option>)}
        </select>
        <select className="input" value={params.get('district') ?? ''} onChange={(e) => updateFilter('district', e.target.value)}>
          <option value="">All districts</option>
          {meta?.districts.map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>

      <div className="mt-8">
        {error ? (
          <Alert>{error}</Alert>
        ) : !classes ? (
          <PageLoader />
        ) : classes.length ? (
          <>
            <p className="mb-4 text-sm text-slate-500">{classes.length} class{classes.length === 1 ? '' : 'es'} found</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map((c) => <ClassCard key={c.id} cls={c} />)}
            </div>
          </>
        ) : (
          <EmptyState
            icon={SearchX}
            title="No classes found"
            text={hasFilters ? 'Try removing some filters.' : 'No teacher has created a class yet.'}
            action={hasFilters && (
              <button className="btn-outline" onClick={() => { setSearch(''); setParams({}, { replace: true }); }}>
                Clear filters
              </button>
            )}
          />
        )}
      </div>
    </div>
  );
}
