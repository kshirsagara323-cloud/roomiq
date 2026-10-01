import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { addDoc, collection, doc, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { ArrowLeft, Send, Video } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLive } from '../lib/hooks';
import { clean, friendlyError, ms, timeAgo } from '../lib/utils';
import { Empty, Loader } from '../components/Ui';

export default function Chat() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [text, setText] = useState('');
  const bottom = useRef(null);

  const { data: convsRaw, loading } = useLive(() => query(collection(db, 'conversations'), where('participants', 'array-contains', user.uid)), [user.uid]);
  const convs = [...convsRaw].sort((a, b) => ms(b.updatedAt) - ms(a.updatedAt));
  const active = convs.find((c) => c.id === id);
  const { data: msgs } = useLive(() => (active ? query(collection(db, 'conversations', id, 'messages'), orderBy('createdAt', 'asc')) : null), [id, !!active]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length]);

  const send = async (e) => {
    e.preventDefault();
    const t = clean(text, 1000);
    if (!t) return;
    setText('');
    try {
      await addDoc(collection(db, 'conversations', id, 'messages'), { senderId: user.uid, text: t, createdAt: serverTimestamp() });
      await updateDoc(doc(db, 'conversations', id), { lastMessage: t.slice(0, 120), updatedAt: serverTimestamp() });
    } catch (ex) {
      setText(t);
      toast(friendlyError(ex), 'err');
    }
  };

  const other = (c) => (c.tenantId === user.uid ? c.ownerName : c.tenantName);
  if (loading) return <Loader />;

  return (
    <div className="container page">
      <div className={`chat card ${id ? 'thread-open' : ''}`}>
        <aside className="chat-list">
          <h3>Messages</h3>
          {!convs.length && <p className="muted pad">No conversations yet. Open a listing and press "Chat with owner".</p>}
          {convs.map((c) => (
            <Link key={c.id} to={`/chat/${c.id}`} className={`conv ${c.id === id ? 'on' : ''}`}>
              <div className="avatar">{(other(c) || '?')[0]}</div>
              <div><strong>{other(c)}</strong><small>{c.propertyName}</small><span>{c.lastMessage || 'Say hello 👋'}</span></div>
            </Link>
          ))}
        </aside>

        <section className="chat-thread">
          {!active ? (
            <Empty title="Select a conversation" text="Your messages update in real time." />
          ) : (
            <>
              <header>
                <button className="btn ghost back" onClick={() => nav('/chat')}><ArrowLeft size={16} /></button>
                <div><strong>{other(active)}</strong><Link to={`/property/${active.propertyId}`}>{active.propertyName}</Link></div>
                <a className="btn ghost" href={`https://meet.jit.si/roomiq-${active.id.replace(/[^a-zA-Z0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"><Video size={16} /> Video call</a>
              </header>
              <div className="msgs">
                {msgs.map((m) => (
                  <div key={m.id} className={`msg ${m.senderId === user.uid ? 'me' : ''}`}>
                    <p>{m.text}</p><small>{timeAgo(m.createdAt)}</small>
                  </div>
                ))}
                <div ref={bottom} />
              </div>
              <form className="composer" onSubmit={send}>
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" maxLength={1000} autoFocus />
                <button className="btn primary" aria-label="Send"><Send size={16} /></button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
