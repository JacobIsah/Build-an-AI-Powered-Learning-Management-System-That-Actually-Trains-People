import React, { useState, useEffect } from 'react';

export default function Dashboard({ userId }) {
  const [profile, setProfile] = useState(null);
  const [nodes, setNodes]     = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, nRes] = await Promise.all([
        fetch(`http://localhost:8000/api/profile/${userId}`),
        fetch("http://localhost:8000/api/nodes"),
      ]);
      const p = await pRes.json();
      const n = await nRes.json();
      setProfile(p);
      setNodes(n.nodes || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  if (loading) return <div style={{ color: "#94a3b8", textAlign: "center", paddingTop: "3rem" }}>Loading dashboard…</div>;
  if (!profile) return null;

  const masteryEntries = Object.entries(profile.mastery || {});
  const completedPct   = nodes.length ? Math.round((profile.completed?.length || 0) / nodes.length * 100) : 0;
  const avgMastery     = masteryEntries.length
    ? Math.round(masteryEntries.reduce((s, [, v]) => s + v, 0) / masteryEntries.length * 100)
    : 0;

  return (
    <div>
      <div style={s.topRow}>
        <h2 style={s.heading}>📊 Your Progress Dashboard</h2>
        <button onClick={load} style={s.refreshBtn}>🔄 Refresh</button>
      </div>

      <div style={s.statRow}>
        <StatCard label="Modules Completed" value={`${profile.completed?.length || 0} / ${nodes.length}`} color="#22c55e" />
        <StatCard label="Completion Rate"   value={`${completedPct}%`}  color="#6366f1" />
        <StatCard label="Avg. Mastery"      value={`${avgMastery}%`}    color="#f59e0b" />
        <StatCard label="Topics Studied"    value={masteryEntries.length} color="#06b6d4" />
      </div>

      <h3 style={s.sectionTitle}>Topic Mastery</h3>
      {masteryEntries.length === 0
        ? <p style={s.empty}>No mastery data yet. Complete a quiz to see results here.</p>
        : masteryEntries.map(([topic, score]) => (
          <MasteryBar key={topic} topic={topic} score={score} />
        ))
      }

      <h3 style={s.sectionTitle}>Module Status</h3>
      <div style={s.nodeGrid}>
        {nodes.map(n => {
          const done = profile.completed?.includes(n.id);
          return (
            <div key={n.id} style={{ ...s.nodeCard, borderColor: done ? "#22c55e33" : "#2d3148" }}>
              <div style={{ fontSize: "1.3rem" }}>{done ? "✅" : "⭕"}</div>
              <div>
                <div style={s.nodeTitle}>{n.title}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{n.topic}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={s.statCard}>
      <div style={{ ...s.statValue, color }}>{value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  );
}

function MasteryBar({ topic, score }) {
  const pct   = Math.round(score * 100);
  const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div style={s.barRow}>
      <div style={s.barLabel}>{topic}</div>
      <div style={s.barTrack}>
        <div style={{ ...s.barFill, width: `${pct}%`, background: color }} />
      </div>
      <div style={{ ...s.barPct, color }}>{pct}%</div>
    </div>
  );
}

const s = {
  topRow:      { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" },
  heading:     { fontSize: "1.5rem", fontWeight: 700, margin: 0 },
  refreshBtn:  { padding: "0.4rem 0.9rem", borderRadius: 6, border: "1px solid #2d3148", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: "0.82rem" },
  statRow:     { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "2rem" },
  statCard:    { background: "#1a1d27", border: "1px solid #2d3148", borderRadius: 10, padding: "1.25rem", textAlign: "center" },
  statValue:   { fontSize: "1.8rem", fontWeight: 700 },
  statLabel:   { fontSize: "0.78rem", color: "#64748b", marginTop: 4 },
  sectionTitle:{ fontSize: "1rem", fontWeight: 600, color: "#94a3b8", marginBottom: "0.75rem", borderBottom: "1px solid #2d3148", paddingBottom: "0.5rem" },
  empty:       { color: "#64748b", fontSize: "0.9rem" },
  barRow:      { display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.65rem" },
  barLabel:    { width: 140, fontSize: "0.85rem", color: "#94a3b8", flexShrink: 0 },
  barTrack:    { flex: 1, height: 8, background: "#2d3148", borderRadius: 4, overflow: "hidden" },
  barFill:     { height: "100%", borderRadius: 4, transition: "width 0.5s ease" },
  barPct:      { width: 36, fontSize: "0.82rem", textAlign: "right", flexShrink: 0 },
  nodeGrid:    { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" },
  nodeCard:    { background: "#1a1d27", border: "1px solid", borderRadius: 10, padding: "0.85rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" },
  nodeTitle:   { fontSize: "0.85rem", fontWeight: 600 },
};
