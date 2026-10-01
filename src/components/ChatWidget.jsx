import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';

const SUPPORT_EMAIL = 'roomiq123@gmail.com';

const RULES = [
  [/verif/i, "Every ROOMIQ listing is checked by our team before it goes live — that's the blue \"Verified\" badge you see on a listing. Owners can never set that badge themselves."],
  [/roommate|match/i, "Head to the \"Roommate match\" page, answer a few quick questions about your habits and budget, and we'll show you compatible tenants in your city — no email or phone shared unless you choose to."],
  [/free|cost|price|pay/i, "Browsing, saving stays, chatting with owners and roommate matching are all free on ROOMIQ. You only pay the rent/deposit you agree directly with the owner."],
  [/list|owner|property/i, "Create a free owner account from \"List your property\", add photos, your rent and a map pin — it goes live for tenants instantly, and you can pause or edit it anytime."],
  [/tour|visit|book/i, "Open any listing and choose \"Request tour\" — pick a date and the owner is notified right away. Track the status from your dashboard."],
  [/chat|message|talk/i, "Press \"Chat with owner\" on any listing to start a live conversation — it's the same chat your dashboard's Messages tab shows."],
  [/human|support|help|contact/i, `A real person is happy to help — email us anytime at ${SUPPORT_EMAIL}.`],
];

const reply = (text) => {
  const hit = RULES.find(([re]) => re.test(text));
  return hit ? hit[1] : `I'm not sure about that one — email our team at ${SUPPORT_EMAIL} and we'll help directly.`;
};

const QUICK = ['How does verification work?', 'Is ROOMIQ free?', 'How do I list my property?', 'Talk to a human'];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ me: false, text: "Hi! I'm the ROOMIQ assistant. Ask me about verification, tours, roommates or listing a property." }]);
  const [text, setText] = useState('');
  const end = useRef(null);

  useEffect(() => { if (open) end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, open]);

  const send = (t) => {
    const q = (t ?? text).trim();
    if (!q) return;
    setMsgs((m) => [...m, { me: true, text: q }]);
    setText('');
    setTimeout(() => setMsgs((m) => [...m, { me: false, text: reply(q) }]), 350);
  };

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen((o) => !o)} aria-label="Open chat assistant">
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && <span className="chat-dot" />}
      </button>

      {open && (
        <div className="chat-panel" role="dialog" aria-label="ROOMIQ assistant">
          <header><strong>ROOMIQ Assistant</strong><span>Usually replies instantly</span></header>
          <div className="chat-panel-msgs">
            {msgs.map((m, i) => <div key={i} className={`cb-msg ${m.me ? 'me' : ''}`}>{m.text}</div>)}
            <div ref={end} />
          </div>
          <div className="chat-quick">
            {QUICK.map((q) => <button key={q} onClick={() => send(q)}>{q}</button>)}
          </div>
          <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a question…" maxLength={300} />
            <button type="submit" aria-label="Send"><Send size={16} /></button>
          </form>
        </div>
      )}
    </>
  );
}