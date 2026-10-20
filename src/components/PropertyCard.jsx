import { Link } from 'react-router-dom';
import { BadgeCheck, Heart, MapPin, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { avgRating, formatINR } from '../lib/utils';

export default function PropertyCard({ p }) {
  const { role } = useAuth();
  const { savedIds, toggleSave } = useData();
  const toast = useToast();
  const saved = savedIds.has(p.id);
  const rating = avgRating(p);

  const onSave = async (e) => {
    e.preventDefault();
    if (role !== 'tenant') return toast('Log in as a tenant to save stays.', 'err');
    try {
      await toggleSave(p.id);
    } catch {
      toast('Could not update saved stays.', 'err');
    }
  };

  return (
    <Link to={`/property/${p.id}`} className="card prop">
      <div className="prop-img">
        {p.images?.[0] ? <img src={p.images[0]} alt={p.name} loading="lazy" /> : <div className="noimg">No photo yet</div>}
        <span className="chip-tl">{p.type}{p.gender !== 'Any' ? ` · ${p.gender}` : ''}</span>
        {(Number(p.beds) || 0) < 1 && <span className="chip-tl" style={{ top: 'auto', bottom: 10, background: '#b91c1c', color: '#fff' }}>Fully booked</span>}
        {role !== 'owner' && (
          <button className={`heart ${saved ? 'on' : ''}`} onClick={onSave} aria-label="Save stay">
            <Heart size={18} />
          </button>
        )}
      </div>
      <div className="prop-body">
        <div className="row between">
          <h3>{p.name}</h3>
          {p.verified && <BadgeCheck size={18} className="verified" title="Verified by RoomIQ" />}
        </div>
        <p className="muted row gap4"><MapPin size={14} /> {p.area}, {p.city}</p>
        <div className="row between end">
          <div className="price">{formatINR(p.price)}<small>/month</small></div>
          <span className="rate">
            <Star size={14} className="on" /> {p.ratingCount ? `${rating.toFixed(1)} (${p.ratingCount})` : 'New'}
          </span>
        </div>
      </div>
    </Link>
  );
}
