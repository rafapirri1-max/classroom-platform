"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

interface Question {
  category: string;
  question: string;
  answer: string;
}

interface GameSet {
  id: string;
  name: string;
  subject: string;
  questions: Question[];
  settings: any;
  created_at: string;
}

const DEFAULT_SETTINGS = {
  timerDuration: 40,
  winMode: "highest",
  pointValues: [-700, -500, -400, -300, -200, 200, 300, 400, 500, 700],
  bossPointValues: [-1200, -900, -700, 700, 900, 1200],
  enableTrap: true,
  enableBoss: true,
  enableEvent: true,
  trapPercent: 12,
  bossPercent: 12,
  eventPercent: 12,
  soundEnabled: true,
};

const COMMON_CATEGORIES = [
  "General Culture", "Science", "History", "Technology", "Economics",
  "Environment", "Geography", "Culture", "Trade", "Media",
  "Politics", "Health", "Space", "Global Issues", "Climate",
  "Education", "Globalisation", "Critical Thinking", "Literature", "Art",
  "Business", "Finance", "Marketing", "GP", "Sociology"
];

function SetsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [sets, setSets] = useState<GameSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [editingSet, setEditingSet] = useState<GameSet | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [newSetSubject, setNewSetSubject] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    { category: "General", question: "", answer: "" }
  ]);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);

  useEffect(() => {
    loadUserAndSets();
  }, []);

  async function loadUserAndSets() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUser(user);

    const { data, error } = await supabase
      .from("game_sets")
      .select("*")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Failed to load sets: " + error.message);
    } else {
      setSets(data || []);
    }
    setLoading(false);
  }

  async function createSet() {
    if (!newSetName.trim()) {
      alert("Set name is required");
      return;
    }

    const validQuestions = questions.filter(q => q.question.trim() && q.answer.trim());
    if (validQuestions.length === 0) {
      alert("Add at least one question with question and answer");
      return;
    }

    const { data, error } = await supabase
      .from("game_sets")
      .insert({
        teacher_id: user.id,
        name: newSetName.trim(),
        subject: newSetSubject.trim(),
        questions: validQuestions,
        settings: DEFAULT_SETTINGS,
      })
      .select()
      .single();

    if (error) {
      alert("Failed to create set: " + error.message);
    } else {
      alert("Set created!");
      setSets(prev => [data, ...prev]);
      setIsCreateDialogOpen(false);
      resetForm();
    }
  }

  async function updateSet() {
    if (!editingSet) return;

    const validQuestions = questions.filter(q => q.question.trim() && q.answer.trim());
    if (validQuestions.length === 0) {
      alert("Add at least one question");
      return;
    }

    const { error } = await supabase
      .from("game_sets")
      .update({
        name: newSetName.trim(),
        subject: newSetSubject.trim(),
        questions: validQuestions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingSet.id);

    if (error) {
      alert("Failed to update set: " + error.message);
    } else {
      alert("Set updated!");
      setSets(prev => prev.map(s => s.id === editingSet.id ? { ...s, name: newSetName.trim(), subject: newSetSubject.trim(), questions: validQuestions } : s));
      setEditingSet(null);
      resetForm();
    }
  }

  async function deleteSet(id: string) {
    if (!confirm("Delete this set?")) return;
    const { error } = await supabase
      .from("game_sets")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Failed to delete: " + error.message);
    } else {
      alert("Set deleted");
      setSets(prev => prev.filter(s => s.id !== id));
    }
  }

  async function duplicateSet(set: GameSet) {
    const { data, error } = await supabase
      .from("game_sets")
      .insert({
        teacher_id: user.id,
        name: set.name + " (Copy)",
        subject: set.subject,
        questions: set.questions,
        settings: set.settings || DEFAULT_SETTINGS,
      })
      .select()
      .single();

    if (error) {
      alert("Failed to duplicate: " + error.message);
    } else {
      alert("Set duplicated!");
      setSets(prev => [data, ...prev]);
    }
  }

  function exportSet(set: GameSet) {
    const data = {
      name: set.name,
      subject: set.subject,
      questions: set.questions,
      settings: set.settings || DEFAULT_SETTINGS,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unfair-set-${set.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert("Set exported!");
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        let qs: Question[];
        if (Array.isArray(data)) {
          qs = data;
        } else if (data && Array.isArray(data.questions)) {
          qs = data.questions;
        } else {
          alert("Invalid JSON format");
          return;
        }

        if (!qs.length) {
          alert("No questions found");
          return;
        }

        setQuestions(qs);
        if (data.name) setNewSetName(data.name);
        if (data.subject) setNewSetSubject(data.subject);
        alert(`Loaded ${qs.length} questions`);
      } catch (err) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  }

  function resetForm() {
    setNewSetName("");
    setNewSetSubject("");
    setQuestions([{ category: "General", question: "", answer: "" }]);
    setExpandedQuestion(0);
  }

  function startEditing(set: GameSet) {
    setEditingSet(set);
    setNewSetName(set.name);
    setNewSetSubject(set.subject);
    setQuestions([...set.questions]);
    setExpandedQuestion(0);
    setIsCreateDialogOpen(true);
  }

  function addQuestion() {
    setQuestions(prev => [...prev, { category: "General", question: "", answer: "" }]);
    setExpandedQuestion(questions.length);
  }

  function updateQuestion(i: number, field: keyof Question, value: string) {
    setQuestions(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function deleteQuestion(i: number) {
    setQuestions(prev => prev.filter((_, idx) => idx !== i));
    if (expandedQuestion === i) setExpandedQuestion(null);
  }

  function moveQuestion(i: number, direction: "up" | "down") {
    if (direction === "up" && i === 0) return;
    if (direction === "down" && i >= questions.length - 1) return;

    setQuestions(prev => {
      const next = [...prev];
      const targetIdx = direction === "up" ? i - 1 : i + 1;
      [next[i], next[targetIdx]] = [next[targetIdx], next[i]];
      return next;
    });
    setExpandedQuestion(direction === "up" ? i - 1 : i + 1);
  }

  function launchGame(setId: string) {
    router.push(`/teacher/launch-unfair?setId=${setId}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.push("/teacher")}
          className="text-slate-400 hover:text-white text-sm mb-4 flex items-center gap-1 transition"
        >
          ← Dashboard
        </button>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">My Sets</h1>
            <p className="text-slate-400">Create and manage question sets for The Unfair Game</p>
          </div>
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-4 py-2 rounded-lg"
          >
            + Create New Set
          </button>
        </div>

        {isCreateDialogOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-yellow-400 text-xl font-bold mb-4">
                {editingSet ? "Edit Set" : "Create New Set"}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-slate-300 mb-1 block">Set Name *</label>
                    <input
                      value={newSetName}
                      onChange={(e) => setNewSetName(e.target.value)}
                      placeholder="e.g., GP Unit 1 - Globalisation"
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-300 mb-1 block">Subject</label>
                    <input
                      value={newSetSubject}
                      onChange={(e) => setNewSetSubject(e.target.value)}
                      placeholder="e.g., Global Perspectives"
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer">
                    <div className="bg-purple-600 hover:bg-purple-700 text-white text-center py-2 rounded-lg font-bold text-sm">
                      📤 Import JSON
                    </div>
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
                    />
                  </label>
                  <div className="text-xs text-slate-400 flex items-center">
                    {questions.length} questions
                  </div>
                </div>

                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {questions.map((q, i) => (
                    <div key={i} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                      <div
                        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-750"
                        onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-sm font-bold text-slate-500 w-8">#{i + 1}</span>
                          <span className="text-yellow-400 text-xs border border-yellow-400/30 px-2 py-0.5 rounded">
                            {q.category}
                          </span>
                          <span className="truncate text-sm text-slate-300">{q.question || "Empty question..."}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); moveQuestion(i, "up"); }}
                            disabled={i === 0}
                            className="text-slate-500 hover:text-white px-1 disabled:opacity-30"
                          >▲</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveQuestion(i, "down"); }}
                            disabled={i === questions.length - 1}
                            className="text-slate-500 hover:text-white px-1 disabled:opacity-30"
                          >▼</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteQuestion(i); }}
                            className="text-red-500 hover:text-red-400 px-1"
                          >
                            🗑
                          </button>
                        </div>
                      </div>

                      {expandedQuestion === i && (
                        <div className="px-4 pb-4 space-y-3 border-t border-slate-700 pt-3">
                          <div>
                            <label className="text-xs font-bold text-slate-400 mb-1 block">Category</label>
                            <input
                              value={q.category}
                              onChange={(e) => updateQuestion(i, "category", e.target.value)}
                              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                            />
                            <div className="flex flex-wrap gap-1 mt-2">
                              {COMMON_CATEGORIES.map(cat => (
                                <button
                                  key={cat}
                                  onClick={() => updateQuestion(i, "category", cat)}
                                  className="text-xs px-2 py-1 rounded-md border transition-colors"
                                  style={{
                                    background: q.category === cat ? "rgba(250,204,21,0.2)" : "#1e293b",
                                    borderColor: q.category === cat ? "#facc15" : "#334155",
                                    color: q.category === cat ? "#facc15" : "#94a3b8",
                                  }}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-400 mb-1 block">Question *</label>
                            <textarea
                              value={q.question}
                              onChange={(e) => updateQuestion(i, "question", e.target.value)}
                              rows={2}
                              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm resize-y"
                              placeholder="Enter the question..."
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-400 mb-1 block">Answer *</label>
                            <textarea
                              value={q.answer}
                              onChange={(e) => updateQuestion(i, "answer", e.target.value)}
                              rows={2}
                              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm resize-y"
                              placeholder="Enter the answer..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {questions.length === 0 && (
                    <div className="text-center text-slate-500 py-8">No questions yet. Click "Add Question" below.</div>
                  )}
                </div>

                <div className="flex gap-3 justify-between pt-4 border-t border-slate-700">
                  <button
                    onClick={addQuestion}
                    className="border border-green-500 text-green-400 hover:bg-green-500/20 px-4 py-2 rounded-lg"
                  >
                    + Add Question
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setIsCreateDialogOpen(false); setEditingSet(null); resetForm(); }}
                      className="border border-slate-600 text-slate-300 hover:bg-slate-700 px-4 py-2 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={editingSet ? updateSet : createSet}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                    >
                      {editingSet ? "Update Set" : "Create Set"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {sets.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
            <div className="text-4xl mb-4">❓</div>
            <h3 className="text-xl font-bold text-white mb-2">No sets yet</h3>
            <p className="text-slate-400 mb-6">Create your first question set to use in The Unfair Game</p>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-6 py-2 rounded-lg"
            >
              + Create First Set
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sets.map((set) => (
              <div key={set.id} className="bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white text-lg font-bold">{set.name}</h3>
                    {set.subject && (
                      <span className="text-slate-400 text-xs border border-slate-600 px-2 py-0.5 rounded mt-1 inline-block">
                        {set.subject}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEditing(set)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      title="Edit"
                    >
                      ✏
                    </button>
                    <button
                      onClick={() => duplicateSet(set)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      title="Duplicate"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => exportSet(set)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      title="Export JSON"
                    >
                      📥
                    </button>
                    <button
                      onClick={() => deleteSet(set.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    {set.questions?.length || 0} questions
                  </span>
                  <button
                    onClick={() => launchGame(set.id)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1 rounded text-sm"
                  >
                    ▶ Launch
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MySetsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    }>
      <SetsContent />
    </Suspense>
  );
}
