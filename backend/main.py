from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import json
import re
from datetime import datetime
from typing import Optional

app = FastAPI(title="AI-Powered LMS", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "neural-chat"

# ─── In-memory store (no DB needed for demo) ───────────────────────────────
learner_profiles: dict = {}
progress_events: list = []

COURSE_NODES = [
    {"id": "1", "title": "Introduction to Python",       "topic": "python-basics",   "difficulty": 0.2, "content": "Python is a high-level, interpreted programming language known for its simplicity and readability. Variables store data, functions organize code, and loops repeat actions. Python uses indentation to define code blocks."},
    {"id": "2", "title": "Functions & Scope",            "topic": "python-basics",   "difficulty": 0.4, "content": "Functions are reusable blocks of code defined with the 'def' keyword. Scope determines variable visibility — local variables exist inside functions, global variables outside. Use 'return' to send values back to the caller."},
    {"id": "3", "title": "Data Structures",              "topic": "data-structures", "difficulty": 0.5, "content": "Python offers lists (ordered, mutable), tuples (ordered, immutable), dictionaries (key-value pairs), and sets (unique values). Lists use indexing; dicts use keys. Choose based on mutability and lookup needs."},
    {"id": "4", "title": "Object-Oriented Programming",  "topic": "oop",             "difficulty": 0.6, "content": "OOP organizes code around objects. Classes are blueprints; instances are objects. Key concepts: encapsulation (bundling data and methods), inheritance (child class extends parent), and polymorphism (same method, different behavior)."},
    {"id": "5", "title": "Async & Concurrency",          "topic": "async",           "difficulty": 0.8, "content": "Python's asyncio library enables asynchronous programming using async/await syntax. Coroutines run concurrently without threads. Use asyncio.gather() to run multiple coroutines. FastAPI natively supports async route handlers."},
]

# ─── Models ────────────────────────────────────────────────────────────────
class PathRequest(BaseModel):
    user_id: str
    goal: str

class QuizRequest(BaseModel):
    user_id: str
    node_id: str
    num_questions: int = 3

class QuizSubmission(BaseModel):
    user_id: str
    node_id: str
    score: float

class TutorMessage(BaseModel):
    message: str

# ─── Helper ────────────────────────────────────────────────────────────────
async def call_ollama(prompt: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(OLLAMA_URL, json={
                "model": MODEL,
                "prompt": prompt,
                "stream": False
            })
            response.raise_for_status()
            
            data = response.json()
            if "response" not in data:
                raise ValueError(f"Unexpected Ollama response format. Got: {data}")
            
            return data["response"]
    except httpx.ConnectError as e:
        raise RuntimeError(f"Cannot connect to Ollama at {OLLAMA_URL}. Is Ollama running? Error: {e}")
    except httpx.HTTPStatusError as e:
        raise RuntimeError(f"Ollama returned error (HTTP {e.response.status_code}): {e.response.text}")
    except ValueError as e:
        raise RuntimeError(f"Invalid Ollama response: {e}")

def get_or_create_profile(user_id: str) -> dict:
    if user_id not in learner_profiles:
        learner_profiles[user_id] = {
            "user_id": user_id,
            "mastery": {},         # topic -> 0.0-1.0
            "completed": [],       # node IDs
            "current_path": [],
        }
    return learner_profiles[user_id]

# ─── Routes ────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "AI LMS running", "model": MODEL}


@app.post("/api/path")
async def generate_path(req: PathRequest):
    """Generate an adaptive learning path based on learner's mastery."""
    profile = get_or_create_profile(req.user_id)

    nodes_summary = [
        {"id": n["id"], "title": n["title"], "topic": n["topic"], "difficulty": n["difficulty"]}
        for n in COURSE_NODES
    ]

    prompt = f"""You are a curriculum expert. Return a JSON array of node IDs in the best learning order for this learner.

Learner goal: {req.goal}
Mastery scores (0=none, 1=mastered): {json.dumps(profile["mastery"])}
Already completed: {profile["completed"]}

Available nodes: {json.dumps(nodes_summary)}

Rules:
- Skip nodes the learner has already completed
- Prioritize weak areas (low mastery scores)
- Order from easier to harder within each topic
- Return ONLY a raw JSON array like ["1","3","2"], no explanation, no markdown.
"""

    raw = await call_ollama(prompt)
    raw = raw.strip()

    # Extract JSON array from response
    match = re.search(r'\[.*?\]', raw, re.DOTALL)
    if match:
        path = json.loads(match.group())
    else:
        path = [n["id"] for n in COURSE_NODES if n["id"] not in profile["completed"]]

    profile["current_path"] = path
    return {"path": path, "nodes": {n["id"]: n for n in COURSE_NODES}}


@app.post("/api/quiz")
async def generate_quiz(req: QuizRequest):
    """Generate a fresh quiz for a given course node."""
    node = next((n for n in COURSE_NODES if n["id"] == req.node_id), None)
    if not node:
        return {"error": "Node not found"}

    prompt = f"""Based on the following course content, generate {req.num_questions} multiple-choice questions.

Topic: {node["title"]}
Content: {node["content"]}

Return ONLY valid JSON in this exact format, no markdown, no explanation:
{{
  "questions": [
    {{
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": "A",
      "explanation": "Short reason why this is correct."
    }}
  ]
}}"""

    raw = await call_ollama(prompt)
    raw = raw.strip()

    # Strip markdown fences if present
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)

    try:
        data = json.loads(raw)
        return {"node": node, "questions": data["questions"]}
    except Exception:
        # Attempt to extract JSON block
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            data = json.loads(match.group())
            return {"node": node, "questions": data.get("questions", [])}
        return {"error": "Failed to parse quiz", "raw": raw}


@app.post("/api/progress")
async def save_progress(sub: QuizSubmission):
    """Save quiz result and update learner mastery."""
    profile = get_or_create_profile(sub.user_id)
    node = next((n for n in COURSE_NODES if n["id"] == sub.node_id), None)
    if not node:
        return {"error": "Node not found"}

    topic = node["topic"]
    current = profile["mastery"].get(topic, 0.0)
    # Exponential Moving Average — recent score weighs 30%
    new_mastery = round(0.3 * sub.score + 0.7 * current, 2)
    profile["mastery"][topic] = new_mastery

    if sub.score >= 0.75 and sub.node_id not in profile["completed"]:
        profile["completed"].append(sub.node_id)

    progress_events.append({
        "user_id": sub.user_id,
        "node_id": sub.node_id,
        "score": sub.score,
        "timestamp": datetime.utcnow().isoformat()
    })

    return {
        "mastery": profile["mastery"],
        "completed": profile["completed"],
        "passed": sub.score >= 0.75
    }


@app.get("/api/profile/{user_id}")
def get_profile(user_id: str):
    return get_or_create_profile(user_id)


@app.get("/api/nodes")
def get_nodes():
    return {"nodes": COURSE_NODES}


# ─── WebSocket Tutor ────────────────────────────────────────────────────────
@app.websocket("/ws/tutor/{user_id}")
async def tutor_ws(websocket: WebSocket, user_id: str):
    await websocket.accept()
    history = []

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            user_msg = payload.get("message", "")
            node_id = payload.get("node_id", "")

            node = next((n for n in COURSE_NODES if n["id"] == node_id), None)
            context = node["content"] if node else "General Python programming."

            history_text = "\n".join([
                f"{'Learner' if m['role'] == 'user' else 'Tutor'}: {m['content']}"
                for m in history[-6:]
            ])

            prompt = f"""You are a concise, helpful programming tutor. Answer based on the context below.
If the answer isn't in the context, say so briefly and give a general answer.

Course Context: {context}

{f'Conversation so far:{chr(10)}{history_text}' if history_text else ''}

Learner: {user_msg}
Tutor:"""

            full_response = ""
            async with httpx.AsyncClient(timeout=120) as client:
                async with client.stream("POST", OLLAMA_URL, json={
                    "model": MODEL,
                    "prompt": prompt,
                    "stream": True
                }) as stream:
                    async for line in stream.aiter_lines():
                        if line:
                            chunk = json.loads(line)
                            token = chunk.get("response", "")
                            full_response += token
                            await websocket.send_text(json.dumps({"token": token, "done": chunk.get("done", False)}))

            history.extend([
                {"role": "user",      "content": user_msg},
                {"role": "assistant", "content": full_response},
            ])

    except WebSocketDisconnect:
        pass
