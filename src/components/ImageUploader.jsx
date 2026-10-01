import { useEffect, useMemo, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { MAX_PER_LISTING } from '../lib/images';

// existing: URLs already saved. files: new File objects waiting to be uploaded on save.
export default function ImageUploader({ existing, setExisting, files, setFiles, onError }) {
  const input = useRef(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);
  const total = existing.length + files.length;

  const add = (list) => {
    const picked = Array.from(list);
    const room = MAX_PER_LISTING - total;
    if (picked.length > room) onError?.(`You can add ${MAX_PER_LISTING} photos per listing.`);
    setFiles([...files, ...picked.slice(0, Math.max(0, room))]);
    if (input.current) input.current.value = '';
  };

  return (
    <div>
      <div className="thumbs">
        {existing.map((u, i) => (
          <div className="thumb" key={u.slice(-40) + i}>
            <img src={u} alt="" />
            <button type="button" onClick={() => setExisting(existing.filter((_, n) => n !== i))} aria-label="Remove photo"><X size={14} /></button>
          </div>
        ))}
        {previews.map((u, i) => (
          <div className="thumb" key={u}>
            <img src={u} alt="" />
            <button type="button" onClick={() => setFiles(files.filter((_, n) => n !== i))} aria-label="Remove photo"><X size={14} /></button>
          </div>
        ))}
        {total < MAX_PER_LISTING && (
          <button type="button" className="thumb add" onClick={() => input.current?.click()}>
            <ImagePlus size={22} />
            <span>Add photo</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => add(e.target.files)} />
      <p className="field-hint">{total}/{MAX_PER_LISTING} photos · JPG, PNG or WebP · they are resized automatically</p>
    </div>
  );
}
