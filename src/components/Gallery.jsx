import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Gallery({ images = [], alt }) {
  const [i, setI] = useState(0);
  if (!images.length) return <div className="gallery noimg">No photos uploaded yet</div>;
  const go = (d) => setI((x) => (x + d + images.length) % images.length);
  return (
    <div className="gallery">
      <img src={images[i]} alt={`${alt} photo ${i + 1}`} />
      {images.length > 1 && (
        <>
          <button className="g-btn l" onClick={() => go(-1)} aria-label="Previous photo"><ChevronLeft /></button>
          <button className="g-btn r" onClick={() => go(1)} aria-label="Next photo"><ChevronRight /></button>
          <div className="g-dots">
            {images.map((_, n) => <button key={n} className={n === i ? 'on' : ''} onClick={() => setI(n)} aria-label={`Photo ${n + 1}`} />)}
          </div>
        </>
      )}
    </div>
  );
}
