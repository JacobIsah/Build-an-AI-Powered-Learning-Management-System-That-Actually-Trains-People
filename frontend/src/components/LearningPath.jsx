import React, { useState } from 'react';

export default function LearningPath({ userId, onQuiz, onTutor }) {
  const [goal, setGoal]     = useState("Learn Python from scratch");
  const [path, setPath]     = useState([]);
  const [nodes, setNodes]   = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const generatePath = async () => {
    setLoading(true); setError(""); setPath([]);
    try {
      const res = await fetch("http://localhost:8000/api/path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, goal }),
      });
      const data = await res.json();
      setPath(data.path || []);
      setNodes(data.nodes || {});
    } catch {
      setError("Could not reach backend. Is FastAPI running on port 8000?");
    }
    setLoading(false);
  };

  const diffColor = (d) => d < 0.4 ? "#22c55e" : d < 0.7 ? "#f59e0b" : "#ef4444";

  return (
    <div>
      <h2 style={s.heading}>Your Adaptive Learning Path</h2>
      <p style={s.sub}>Tell the AI your goal and it will build a personalized course sequence.</p>

      <div style={s.inputRow}>
        <input
          value={goal}
          onChange={e => setGoal(e.target.value)}
          style={s.input}
          placeholder="e.g. Learn Python for data science"
        />
        <button onClick={generatePath} style={s.btn} disabled={loading}>
          {loading ? "⏳ Generating..." : "🚀 Generate Path"}
        </button>
      </div>

      {error && <p style={s.error}>{error}</p>}

      {loading && (
        <div style={s.thinking}>
          <span style={s.spinner}>⚙️</span> Mistral is building your path…
        </div>
      )}

      {path.length > 0 && (
        <div>
          <p style={s.meta}>📋 {path.length} modules in your personalized path</p>
          {path.map((id, i) => {
            const node = nodes[id];
            if (!node) return null;
            return (
              <div key={id} style={s.card}>
                <div style={s.cardLeft}>
                  <span style={s.step}>{i + 1}</span>
                  <div>
                    <div style={s.nodeTitle}>{node.title}</div>
                    <div style={s.nodeMeta}>
                      <span style={{ color: diffColor(node.difficulty) }}>
                        ● {node.difficulty < 0.4 ? "Beginner" : node.difficulty < 0.7 ? "Intermediate" : "Advanced"}
                      </span>
                      <span style={s.sep}>·</span>
                      <span style={s.topic}>{node.topic}</span>
                    </div>
                  </div>
                </div>
                <div style={s.cardActions}>
                  <button style={s.actionBtn} onClick={() => onTutor(node)}>🤖 Ask Tutor</button>
                  <button style={{ ...s.actionBtn, ...s.quizBtn }} onClick={() => onQuiz(node)}>📝 Take Quiz</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  heading:     { fontSize: "1.5rem", fontWeight: 700, marginBottom: 4 },
  sub:         { color: "#94a3b8", marginBottom: "1.5rem" },
  inputRow:    { display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" },
  input:       { flex: 1, minWidth: 200, padding: "0.65rem 1rem", borderRadius: 8, border: "1px solid #2d3148", background: "#1a1d27", color: "#e2e8f0", fontSize: "0.95rem" },
  btn:         { padding: "0.65rem 1.4rem", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" },
  error:       { color: "#f87171", background: "#2d1515", padding: "0.75rem 1rem", borderRadius: 8 },
  thinking:    { color: "#94a3b8", padding: "1rem", textAlign: "center" },
  spinner:     { marginRight: 8 },
  meta:        { color: "#64748b", fontSize: "0.85rem", marginBottom: "1rem" },
  card:        { background: "#1a1d27", border: "1px solid #2d3148", borderRadius: 10, padding: "1rem 1.25rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" },
  cardLeft:    { display: "flex", alignItems: "center", gap: "1rem" },
  step:        { width: 28, height: 28, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, flexShrink: 0 },
  nodeTitle:   { fontWeight: 600, fontSize: "0.95rem", marginBottom: 3 },
  nodeMeta:    { fontSize: "0.8rem", color: "#94a3b8" },
  sep:         { margin: "0 6px" },
  topic:       { color: "#6366f1" },
  cardActions: { display: "flex", gap: "0.5rem" },
  actionBtn:   { padding: "0.4rem 0.85rem", borderRadius: 6, border: "1px solid #2d3148", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: "0.82rem" },
  quizBtn:     { background: "#6366f1", borderColor: "#6366f1", color: "#fff" },
};
