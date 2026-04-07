import React, { useState } from 'react';
import LearningPath from './components/LearningPath';
import Quiz from './components/Quiz';
import Tutor from './components/Tutor';
import Dashboard from './components/Dashboard';

const USER_ID = "demo-user-1";

const NAV = [
  { id: "path",      label: "📚 Learning Path" },
  { id: "quiz",      label: "📝 Quiz"          },
  { id: "tutor",     label: "🤖 AI Tutor"      },
  { id: "dashboard", label: "📊 Dashboard"     },
];

export default function App() {
  const [tab, setTab]           = useState("path");
  const [activeNode, setNode]   = useState(null);

  const goToQuiz = (node) => { setNode(node); setTab("quiz"); };
  const goToTutor = (node) => { setNode(node); setTab("tutor"); };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.logo}>⚡ AI-LMS <span style={styles.badge}>Ollama · Mistral</span></h1>
        <nav style={styles.nav}>
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              style={{ ...styles.navBtn, ...(tab === n.id ? styles.navActive : {}) }}
            >
              {n.label}
            </button>
          ))}
        </nav>
      </header>

      <main style={styles.main}>
        {tab === "path"      && <LearningPath userId={USER_ID} onQuiz={goToQuiz} onTutor={goToTutor} />}
        {tab === "quiz"      && <Quiz userId={USER_ID} node={activeNode} />}
        {tab === "tutor"     && <Tutor userId={USER_ID} node={activeNode} />}
        {tab === "dashboard" && <Dashboard userId={USER_ID} />}
      </main>
    </div>
  );
}

const styles = {
  app:       { fontFamily: "'Segoe UI', sans-serif", minHeight: "100vh", background: "#0f1117", color: "#e2e8f0" },
  header:    { background: "#1a1d27", borderBottom: "1px solid #2d3148", padding: "0 2rem", display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" },
  logo:      { margin: 0, fontSize: "1.3rem", fontWeight: 700, padding: "1rem 0", color: "#fff" },
  badge:     { fontSize: "0.7rem", background: "#6366f1", borderRadius: 4, padding: "2px 8px", marginLeft: 8, verticalAlign: "middle" },
  nav:       { display: "flex", gap: "0.5rem", flexWrap: "wrap" },
  navBtn:    { background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "0.5rem 1rem", borderRadius: 6, fontSize: "0.9rem", transition: "all 0.2s" },
  navActive: { background: "#6366f1", color: "#fff" },
  main:      { maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" },
};
