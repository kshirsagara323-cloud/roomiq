import { useEffect, useState } from 'react';
import { Home } from 'lucide-react';

// Full-screen splash shown once while the app boots (fonts, auth check, first data).
export default function LoadingScreen({ show }) {
  const [hide, setHide] = useState(false);
  useEffect(() => {
    if (!show) {
      const t = setTimeout(() => setHide(true), 350); // let the fade-out play
      return () => clearTimeout(t);
    }
    setHide(false);
  }, [show]);

  if (hide) return null;
  return (
    <div className={`splash ${show ? '' : 'splash-out'}`}>
      <div className="splash-mark"><Home size={26} /></div>
      <div className="splash-word">ROOM<span>IQ</span></div>
      <div className="splash-bar"><span /></div>
    </div>
  );
}