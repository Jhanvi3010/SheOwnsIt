import { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';

const FemaleIcon = ({ size = 24 }: { size?: number; color?: string }) => (
  <span style={{ fontSize: size, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    👩🏻
  </span>
);
import axios from 'axios';

type Message = {
  id: number;
  from: 'user' | 'bot';
  text: string;
  time: string;
};

const QUICK_PROMPTS = [
  'How do I book an appointment?',
  'What services do you offer?',
  'How do I volunteer?',
  'What is your privacy policy?',
];

const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      from: 'bot',
      text: 'Hi! I\'m the SheOwnsIt Assistant. I can help with appointments, services, volunteering, and more. How can I help you today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = {
      id: Date.now(),
      from: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    try {
      const res = await axios.post('/api/chatbot', { message: text });
      const botMsg: Message = {
        id: Date.now() + 1,
        from: 'bot',
        text: res.data.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setTimeout(() => {
        setTyping(false);
        setMessages(prev => [...prev, botMsg]);
      }, 600);
    } catch {
      setTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        from: 'bot',
        text: 'Sorry, I couldn\'t connect right now. Please try again shortly.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(79,70,229,0.4)',
          zIndex: 1000,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: open ? 'scale(0.9)' : 'scale(1)',
          fontSize: '26px',
        }}
        title="Chat with DFS Assistant"
      >
        {open ? <X size={24} color="white" /> : <FemaleIcon size={32} color="white" />}
        {!open && messages.length > 1 && (
          <span style={{
            position: 'absolute', top: '-2px', right: '-2px',
            width: '18px', height: '18px', borderRadius: '50%',
            background: '#ef4444', color: 'white', fontSize: '0.65rem',
            fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid white',
          }}>
            {Math.min(messages.filter(m => m.from === 'bot').length - 1, 9)}
          </span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '28px',
          width: '360px',
          maxHeight: '520px',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.18), 0 8px 20px rgba(79,70,229,0.12)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.25s ease-out',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <FemaleIcon size={26} color="white" />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>SheOwnsIt Assistant</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Online — here to help
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '4px',
            }}>
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{
                display: 'flex',
                flexDirection: msg.from === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                gap: '8px',
              }}>
                {msg.from === 'bot' && (
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FemaleIcon size={18} color="white" />
                  </div>
                )}
                <div style={{
                  maxWidth: '75%',
                  padding: '10px 14px',
                  borderRadius: msg.from === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.from === 'user'
                    ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                    : '#f8fafc',
                  color: msg.from === 'user' ? 'white' : '#374151',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                  boxShadow: msg.from === 'user' ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
                  whiteSpace: 'pre-line',
                }}>
                  {msg.text}
                  <div style={{
                    fontSize: '0.68rem',
                    color: msg.from === 'user' ? 'rgba(255,255,255,0.6)' : '#94a3b8',
                    marginTop: '4px',
                    textAlign: 'right',
                  }}>
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}

            {typing && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <FemaleIcon size={18} color="white" />
                </div>
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '18px 18px 18px 4px', display: 'flex', gap: '4px' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: '7px', height: '7px', borderRadius: '50%', background: '#94a3b8',
                      display: 'inline-block',
                      animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          {messages.length <= 2 && (
            <div style={{ padding: '0 16px 12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {QUICK_PROMPTS.map(q => (
                <button key={q} onClick={() => send(q)} style={{
                  padding: '6px 12px', borderRadius: '20px', border: '1px solid #e0e7ff',
                  background: '#f5f3ff', color: '#4f46e5', fontSize: '0.78rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Ask me anything…"
              style={{
                flex: 1, padding: '10px 14px', border: '2px solid #e2e8f0',
                borderRadius: '12px', fontSize: '0.88rem', outline: 'none',
                background: '#f8fafc', color: '#0f172a',
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || typing}
              style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: input.trim() ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#e2e8f0',
                border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.2s ease',
              }}
            >
              <Send size={16} color={input.trim() ? 'white' : '#94a3b8'} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
};

export default Chatbot;
