import React, { useState } from 'react';

export default function Quiz({ userId, node }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers]     = useState({});
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const fetchQuiz = async () => {
    if (!node) return;
    setLoading(true); setError(""); setResult(null); setAnswers({});
    try {
      const res = await fetch("http://localhost:8000/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, node_id: node.id, num_questions: 3 }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else { setQuestions(data.questions || []); }
    } catch { setError("Backend unreachable."); }
    setLoading(false);
  };

  const submit = async () => {
    const correct = questions.filter((q, i) => answers[i] === q.correct).length;
    const score   = correct / questions.length;
    setSaving(true);
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, node_id: node.id, score }),
    });
    setSaving(false);
    setResult({ score, correct, total: questions.length, passed: score >= 0.75 });
  };

  if (!node) return (
    <div style={s.empty}>
      <p>No module selected.</p>
      <p style={{ color: "#64748b" }}>Go to Learning Path and click <strong>📝 Take Quiz</strong> on a module.</p>
    </div>
  );

  return (
    <div>
      <h2 style={s.heading}>Quiz: {node.title}</h2>
      <p style={s.sub}>{node.topic} · {node.difficulty < 0.4 ? "Beginner" : node.difficulty < 0.7 ? "Intermediate" : "Advanced"}</p>

      {questions.length === 0 && !loading && !error && (
        <button onClick={fetchQuiz} style={s.btn}>⚡ Generate Quiz with Mistral</button>
      )}

      {loading && <div style={s.loading}>⏳ Mistral is writing your questions…</div>}
      {error   && <div style={s.error}>{error}</div>}

      {questions.length > 0 && !result && (
        <div>
          {questions.map((q, i) => (
            <div key={i} style={s.card}>
              <p style={s.qText}><strong>Q{i + 1}.</strong> {q.question}</p>
              <div style={s.options}>
                {q.options.map((opt, j) => {
                  const letter = ["A","B","C","D"][j];
                  const selected = answers[i] === letter;
                  return (
                    <button
                      key={j}
                      style={{ ...s.option, ...(selected ? s.selected : {}) }}
                      onClick={() => setAnswers({ ...answers, [i]: letter })}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <button
            onClick={submit}
            disabled={Object.keys(answers).length < questions.length || saving}
            style={{ ...s.btn, marginTop: "1rem" }}
          >
            {saving ? "Saving…" : "✅ Submit Answers"}
          </button>
          <p style={s.hint}>{Object.keys(answers).length}/{questions.length} answered</p>
        </div>
      )}

      {result && (
        <div style={{ ...s.card, textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "3rem" }}>{result.passed ? "🎉" : "📚"}</div>
          <h3 style={{ color: result.passed ? "#22c55e" : "#f59e0b" }}>
            {result.passed ? "Passed!" : "Keep Practicing"}
          </h3>
          <p style={s.scoreText}>{result.correct}/{result.total} correct — {Math.round(result.score * 100)}%</p>
          {!result.passed && <p style={{ color: "#94a3b8" }}>Need 75% to pass. Try the AI Tutor to review the material!</p>}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "1rem", flexWrap: "wrap" }}>
            <button onClick={() => { setQuestions([]); setResult(null); setAnswers({}); }} style={s.btn}>
              🔄 Retry Quiz
            </button>
          </div>
          {questions.map((q, i) => (
            <div key={i} style={{ ...s.card, textAlign: "left", marginTop: "0.75rem" }}>
              <p style={{ fontSize: "0.85rem", color: answers[i] === q.correct ? "#22c55e" : "#ef4444" }}>
                {answers[i] === q.correct ? "✓" : "✗"} Q{i+1}: {q.question}
              </p>
              {answers[i] !== q.correct && (
                <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Correct: <strong>{q.correct}</strong> — {q.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  heading:   { fontSize: "1.5rem", fontWeight: 700, marginBottom: 4 },
  sub:       { color: "#6366f1", marginBottom: "1.5rem", fontSize: "0.9rem" },
  empty:     { textAlign: "center", color: "#94a3b8", paddingTop: "3rem" },
  btn:       { padding: "0.65rem 1.4rem", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" },
  loading:   { color: "#94a3b8", padding: "1rem", textAlign: "center" },
  error:     { color: "#f87171", background: "#2d1515", padding: "0.75rem 1rem", borderRadius: 8 },
  card:      { background: "#1a1d27", border: "1px solid #2d3148", borderRadius: 10, padding: "1.25rem", marginBottom: "0.75rem" },
  qText:     { marginBottom: "0.75rem", fontSize: "0.95rem" },
  options:   { display: "flex", flexDirection: "column", gap: "0.5rem" },
  option:    { padding: "0.6rem 1rem", borderRadius: 8, border: "1px solid #2d3148", background: "#0f1117", color: "#e2e8f0", cursor: "pointer", textAlign: "left", fontSize: "0.88rem", transition: "all 0.15s" },
  selected:  { borderColor: "#6366f1", background: "#1e1f3b", color: "#a5b4fc" },
  hint:      { color: "#64748b", fontSize: "0.82rem", marginTop: "0.5rem" },
  scoreText: { fontSize: "1.1rem", fontWeight: 600 },
};
