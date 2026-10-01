import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Heart, KeyRound, MapPin, MessageCircle, MessageSquare, Search, ShieldCheck, Sparkles, Star, Users } from 'lucide-react';
import { useData } from '../context/DataContext';
import PropertyCard from '../components/PropertyCard';
import { Empty, Loader } from '../components/Ui';
import { CITIES, TYPES } from '../lib/constants';
import { avgRating } from '../lib/utils';

export default function Home() {
  const { properties, loading } = useData();
  const nav = useNavigate();
  const [city, setCity] = useState('');
  const [type, setType] = useState('');
  const [budget, setBudget] = useState('');

  const search = (e) => {
    e.preventDefault();
    const q = new URLSearchParams();
    if (city) q.set('city', city);
    if (type) q.set('type', type);
    if (budget) q.set('max', budget);
    nav(`/explore?${q}`);
  };

  const featured = [...properties].sort((a, b) => avgRating(b) - avgRating(a) || 0).slice(0, 6);
  const cities = new Set(properties.map((p) => p.city)).size;
  const rated = properties.filter((p) => p.ratingCount > 0);
  const overallRating = rated.length ? (rated.reduce((s, p) => s + avgRating(p), 0) / rated.length).toFixed(1) : null;

  return (
    <>
      <section className="hero">
  <div className="container hero-in">
    <div className="hero-text">
      <span className="pill light">Verified PGs · Hostels · Flats</span>
      <h1>Find a place that feels <em>like you.</em></h1>
      <p>Thoughtfully verified rooms, flats and shared homes for the next chapter of your life.</p>

      <div className="hero-actions">
        <Link to="/explore" className="btn light">Find your room <ArrowRight size={16} /></Link>
      </div>

      <form className="search" onSubmit={search}>
        <label><MapPin size={16} />
          <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="City">
            <option value="">Any city</option>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Stay type">
            <option value="">Any type</option>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label>
          <select value={budget} onChange={(e) => setBudget(e.target.value)} aria-label="Budget">
            <option value="">Any budget</option>
            {[6000, 10000, 15000, 25000].map((b) => <option key={b} value={b}>Up to ₹{b.toLocaleString('en-IN')}</option>)}
          </select>
        </label>
        <button className="btn primary"><Search size={16} /> Search</button>
      </form>

      <div className="stats">
        <div><b>{properties.length}</b><span>live listings</span></div>
        <div><b>{cities}</b><span>cities</span></div>
        <div><b>Free</b><span>to browse & chat</span></div>
      </div>
    </div>

    <div className="hero-photo">
      <img
        src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85"
        alt="A verified ROOMIQ home"
        loading="eager"
      />
      <div className="float-card rating">
        <Star size={18} className="on" />
        <div><b>{overallRating || '4.9'}/5</b><span>average stay rating</span></div>
      </div>
      <div className="float-card verified">
        <BadgeCheck size={20} />
        <div><b>Verified homes</b><span>so you can move with confidence</span></div>
      </div>
    </div>
  </div>
</section>

            <section className="steps-wrap">
        <div className="container section">
          <span className="eyebrow center-block">A SMOOTHER MOVE</span>
          <h2 className="center">Three steps to your next chapter.</h2>
          <p className="center muted steps-sub">Less scrolling. More certainty. A place you're excited to come home to.</p>
          <div className="grid3 steps">
            {[
              [Search, '01', 'Tell us what feels right', "Share your city, budget and must-haves. We'll make the search feel like yours."],
              [Heart, '02', 'Save the good ones', 'Compare verified homes, chat with owners and shortlist your favourites.'],
              [KeyRound, '03', 'Move in, confidently', 'Book a tour or reserve your room with transparent terms and support throughout.'],
            ].map(([Icon, n, t, d], i) => (
              <div key={n} className={`step-card ${i === 1 ? 'on' : ''}`}>
                <span className="step-no">{n}</span>
                <div className="step-icon"><Icon size={20} /></div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

            <section className="section promise-wrap">
        <div className="container promise">
          <div className="promise-text">
            <span className="eyebrow">ROOMIQ PROMISE</span>
            <h2>Not just a room.<br /><em>A better beginning.</em></h2>
            <p>We make the messy parts of moving feel simple — with homes you can trust, people you can meet, and support when you need it.</p>
            <Link to="/explore" className="link-arrow">See how it works <ArrowRight size={15} /></Link>
          </div>
          <div className="promise-cards">
            <div className="promise-card">
              <span className="promise-no">01</span>
              <ShieldCheck size={22} />
              <h3>Verified, always</h3>
              <p>Real photos, real locations, real peace of mind.</p>
            </div>
            <div className="promise-card on">
              <span className="promise-no">02</span>
              <Sparkles size={22} />
              <h3>Matched to your life</h3>
              <p>Filter for the things that make a place feel right.</p>
            </div>
            <div className="promise-card">
              <span className="promise-no">03</span>
              <MessageSquare size={22} />
              <h3>Support that stays</h3>
              <p>Have a question? A real person is one tap away.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container section">
        <h2 className="center">Three steps to your next chapter</h2>
        <div className="grid3 steps">
          {[['1', 'Search', 'Filter by city, budget, type and amenities.'], ['2', 'Save & talk', 'Save favourites, chat and book a tour.'], ['3', 'Move in', 'Pick the place and the people you click with.']].map(([n, t, d]) => (
            <div key={n} className="step"><span>{n}</span><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>
      </section>

            <section className="roommate-promo">
        <div className="container promo-in">
          <div>
            <span className="eyebrow"><Sparkles size={13} /> NEW ON ROOMIQ</span>
            <h2>Good homes are great.<br /><em>Good housemates are magic.</em></h2>
            <p>Tell us how you live, and we'll introduce you to people who make everyday life easier.</p>
            <Link to="/roommates" className="btn primary">Find my roommate match <ArrowRight size={16} /></Link>
          </div>
          <div className="roommate-visual">
            <span className="rv-avatar rv-a">AS</span>
            <span className="rv-avatar rv-b">RM</span>
            <span className="rv-avatar rv-c">PK</span>
            <div className="rv-center"><Users size={16} /><b>94%</b><span>compatible</span></div>
          </div>
        </div>
      </section>

      <section className="container section owner-promo">
        <div>
          <span className="eyebrow">FOR PROPERTY OWNERS</span>
          <h2>Your space has a story.<br />Let's help it find the right people.</h2>
          <p>List your property with ROOMIQ and reach residents who value the way you've made a place feel.</p>
          <Link to="/owner/register" className="btn dark">List your property <ArrowRight size={16} /></Link>
        </div>
        <div className="owner-stats">
          <div><b>3.2x</b><span>faster occupancy</span></div>
          <div><b>92%</b><span>quality enquiries</span></div>
          <div><b>24/7</b><span>owner support</span></div>
        </div>
      </section>
    </>
  );
}
