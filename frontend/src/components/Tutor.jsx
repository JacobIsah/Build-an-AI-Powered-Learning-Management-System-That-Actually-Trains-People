import React, { useState, useEffect, useRef } from 'react';

export default function Tutor({ userId, node }) {
  const [messages, setMessages] = useState([
    { role: "tutor", text: "Hi! I'm your AI tutor powered by Mistral. Select a module from the Learning Path and ask me anything about it. 👋" }
  ]);
  const [input, setInput]   = useState("");
  const [ws, setWs]         = useState(null);
  const [typing, setTyping] = useState(false);
  const bottomRef           = useRef(null);

  useEffect(() => {
    const socket = new WebSocket(`ws://localhost:8000/ws/tutor/${userId}`);
    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      const token = data.token || "";
      const done  = data.done;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "tutor-stream") {
          return [...prev.slice(0, -1), { role: "tutor-stream", text: last.text + token }];
        }
        return [...prev, { role: "tutor-stream", text: token }];
      });
      if (done) {
        setTyping(false);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "tutor-stream") {
            return [...prev.slice(0, -1), { role: "tutor", text: last.text }];
          }
          return prev;
        });
      }
    };
    setWs(socket);
    return () => socket.close();
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!input.trim() || !ws || typing) return;
    const msg = input.trim();
    setInput("");
    setTyping(true);
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    ws.send(JSON.stringify({ message: msg, node_id: node?.id || "" }));
  };

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.heading}>🤖 AI Tutor</h2>
        {node && <span style={s.context}>Context: <strong>{node.title}</strong></span>}
        {!node && <span style={s.noContext}>No module selected — ask general questions</span>}
      </div>

      <div style={s.chatBox}>
        {messages.map((m, i) => (
          <div key={i} style={{ ...s.bubble, ...(m.role === "user" ? s.userBubble : s.tutorBubble) }}>
            {m.role !== "user" && <span style={s.avatar}>🤖</span>}
            <div style={s.bubbleText}>{m.text}</div>
            {m.role === "user" && <span style={s.avatar}>👤</span>}
          </div>
        ))}
        {typing && (
          <div style={{ ...s.bubble, ...s.tutorBubble }}>
            <span style={s.avatar}>🤖</span>
            <div style={s.typingDots}><span/><span/><span/></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={s.inputRow}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          style={s.textarea}
          placeholder={node ? `Ask about ${node.title}…` : "Ask any Python question…"}
          rows={2}
          disabled={typing}
        />
        <button onClick={send} style={s.sendBtn} disabled={!input.trim() || typing}>
          {typing ? "⏳" : "➤"}
        </button>
      </div>
      <p style={s.hint}>Press Enter to send · Shift+Enter for new line</p>
    </div>
  );
}

const s = {
  container:  { display: "flex", flexDirection: "column", height: "calc(100vh - 160px)" },
  header:     { marginBottom: "1rem" },
  heading:    { fontSize: "1.5rem", fontWeight: 700, margin: 0 },
  context:    { fontSize: "0.85rem", color: "#6366f1", display: "block", marginTop: 4 },
  noContext:  { fontSize: "0.85rem", color: "#64748b", display: "block", marginTop: 4 },
  chatBox:    { flex: 1, overflowY: "auto", background: "#1a1d27", border: "1px solid #2d3148", borderRadius: 10, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" },
  bubble:     { display: "flex", gap: "0.5rem", alignItems: "flex-start", maxWidth: "80%" },
  userBubble: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  tutorBubble:{ alignSelf: "flex-start" },
  avatar:     { fontSize: "1.1rem", flexShrink: 0, marginTop: 2 },
  bubbleText: { background: "#0f1117", border: "1px solid #2d3148", borderRadius: 10, padding: "0.6rem 0.9rem", fontSize: "0.9rem", lineHeight: 1.6, whiteSpace: "pre-wrap" },
  typingDots: { display: "flex", gap: 4, alignItems: "center", padding: "0.75rem 1rem", background: "#0f1117", border: "1px solid #2d3148", borderRadius: 10 },
  inputRow:   { display: "flex", gap: "0.75rem", marginTop: "0.75rem", alignItems: "flex-end" },
  textarea:   { flex: 1, padding: "0.65rem 1rem", borderRadius: 8, border: "1px solid #2d3148", background: "#1a1d27", color: "#e2e8f0", fontSize: "0.9rem", resize: "none", lineHeight: 1.5 },
  sendBtn:    { padding: "0.65rem 1.2rem", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", fontSize: "1.1rem", alignSelf: "stretch" },
  hint:       { color: "#475569", fontSize: "0.75rem", marginTop: "0.25rem" },
};
