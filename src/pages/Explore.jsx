import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { List, Map as MapIcon, SlidersHorizontal } from 'lucide-react';
import { useData } from '../context/DataContext';
import PropertyCard from '../components/PropertyCard';
import { ListingsMap } from '../components/MapView';
import { Empty, Loader } from '../components/Ui';
import { AMENITIES, CITIES, GENDERS, TYPES } from '../lib/constants';
import { avgRating, ms } from '../lib/utils';

export default function Explore() {
  const { properties, loading } = useData();
  const [sp, setSp] = useSearchParams();
  const [view, setView] = useState('list');
  const [showFilters, setShowFilters] = useState(false);

  const city = sp.get('city') || '';
  const type = sp.get('type') || '';
  const gender = sp.get('gender') || '';
  const max = Number(sp.get('max')) || 0;
  const q = sp.get('q') || '';
  const sort = sp.get('sort') || 'new';
  const am = sp.getAll('am');

  const set = (k, v) => {
    const n = new URLSearchParams(sp);
    if (v) n.set(k, v);
    else n.delete(k);
    setSp(n, { replace: true });
  };
  const toggleAm = (a) => {
    const n = new URLSearchParams(sp);
    const cur = n.getAll('am');
    n.delete('am');
    (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]).forEach((x) => n.append('am', x));
    setSp(n, { replace: true });
  };

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = properties.filter(
      (p) =>
        (!city || p.city === city) &&
        (!type || p.type === type) &&
        (!gender || p.gender === gender || p.gender === 'Any') &&
        (!max || p.price <= max) &&
        am.every((a) => p.amenities?.includes(a)) &&
        (!term || `${p.name} ${p.area} ${p.city}`.toLowerCase().includes(term)),
    );
    const by = {
      new: (a, b) => ms(b.createdAt) - ms(a.createdAt),
      low: (a, b) => a.price - b.price,
      high: (a, b) => b.price - a.price,
      rating: (a, b) => avgRating(b) - avgRating(a),
    }[sort];
    return list.sort(by);
  }, [properties, city, type, gender, max, q, sort, am.join('|')]); // eslint-disable-line

  return (
    <div className="container page">
      <div className="row between wrap gap">
        <h1>Explore stays</h1>
        <div className="row gap">
          <div className="seg">
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}><List size={15} /> List</button>
            <button className={view === 'map' ? 'on' : ''} onClick={() => setView('map')}><MapIcon size={15} /> Map</button>
          </div>
          <button className="btn ghost filter-toggle" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={15} /> Filters</button>
        </div>
      </div>

      <div className="layout">
        <aside className={`filters card ${showFilters ? 'open' : ''}`}>
          <input className="plain" placeholder="Search name or area" value={q} onChange={(e) => set('q', e.target.value)} maxLength={60} />
          <label className="fl">City
            <select value={city} onChange={(e) => set('city', e.target.value)}>
              <option value="">All cities</option>
              {CITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="fl">Stay type
            <select value={type} onChange={(e) => set('type', e.target.value)}>
              <option value="">All types</option>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="fl">I am looking for
            <select value={gender} onChange={(e) => set('gender', e.target.value)}>
              <option value="">Anyone</option>
              {GENDERS.filter((g) => g !== 'Any').map((g) => <option key={g}>{g}</option>)}
            </select>
          </label>
          <label className="fl">Max rent: {max ? `₹${max.toLocaleString('en-IN')}` : 'no limit'}
            <input type="range" min="3000" max="50000" step="1000" value={max || 50000} onChange={(e) => set('max', Number(e.target.value) >= 50000 ? '' : e.target.value)} />
          </label>
          <label className="fl">Sort by
            <select value={sort} onChange={(e) => set('sort', e.target.value)}>
              <option value="new">Newest</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
              <option value="rating">Best rated</option>
            </select>
          </label>
          <div className="fl">Amenities
            <div className="chips">
              {AMENITIES.map((a) => <button type="button" key={a} className={`chip ${am.includes(a) ? 'on' : ''}`} onClick={() => toggleAm(a)}>{a}</button>)}
            </div>
          </div>
          <button className="btn ghost block" onClick={() => setSp({}, { replace: true })}>Clear filters</button>
        </aside>

        <section>
          <p className="muted">{loading ? 'Loading…' : `${results.length} stay${results.length === 1 ? '' : 's'} found`}</p>
          {loading ? (
            <Loader />
          ) : !results.length ? (
            <Empty title="No stays match your filters" text="Try a different city or clear a few filters." />
          ) : view === 'map' ? (
            <ListingsMap items={results} />
          ) : (
            <div className="grid two">{results.map((p) => <PropertyCard key={p.id} p={p} />)}</div>
          )}
        </section>
      </div>
    </div>
  );
}
