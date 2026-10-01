import { Sparkles } from 'lucide-react';

export default function AnnouncementBar() {
  return (
    <div className="announce">
      <div className="container announce-in">
        <span><Sparkles size={13} /> India's smarter way to find a room</span>
        <span className="announce-right">Verified homes · Secure deposits · Human support</span>
      </div>
    </div>
  );
}