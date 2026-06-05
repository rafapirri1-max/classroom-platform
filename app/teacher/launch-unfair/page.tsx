"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

interface GameSet {
  id: string;
  name: string;
  subject: string;
  questions: any[];
  settings: any;
}

interface ClassData {
  id: string;
  class_name: string;
  class_code: string;
}

function LaunchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSetId = searchParams.get("setId");
  const supabase = createClient();

  const [sets, setSets] = useState<GameSet[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedSet, setSelectedSet] = useState<string>(preselectedSetId || "");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [teamCount, setTeamCount] = useState(4);
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUser(user);

    const { data: setsData } = await supabase
      .from("game_sets")
      .select("*")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });
    setSets(setsData || []);

    const { data: classesData } = await supabase
      .from("classes")
      .select("id, class_name, class_code")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });
    setClasses(classesData || []);

    setRoomCode(generateRoomCode());
    setLoading(false);
  }

  function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async function launchGame() {
    if (!selectedSet) {
      setError("Select a question set");
      return;
    }
    if (!selectedClass) {
      setError("Select a class");
      return;
    }

    const set = sets.find(s => s.id === selectedSet);
    if (!set) {
      setError("Set not found");
      return;
    }

    const { data: session, error: dbError } = await supabase
      .from("unfair_game_sessions")
      .insert({
        class_id: selectedClass,
        room_code: roomCode,
        set_id: selectedSet,
        teacher_id: user.id,
        status: "active",
        team_names: Array.from({ length: teamCount }, (_, i) => `Team ${i + 1}`),
      })
      .select()
      .single();

    if (dbError) {
      setError("Failed to launch: " + dbError.message);
      return;
    }

    router.push(`/teacher/unfair-host?sessionId=${session.id}&roomCode=${roomCode}`);
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
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push("/teacher/sets")}
          className="text-slate-400 hover:text-white mb-6 flex items-center gap-2"
        >
          ← Back to My Sets
        </button>

        <h1 className="text-3xl font-bold text-white mb-2">Launch Unfair Game</h1>
        <p className="text-slate-400 mb-8">Configure your game and share the room code with students</p>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h2 className="text-white font-semibold mb-4">Game Setup</h2>

          <div className="space-y-4">
            <div>
              <label className="text-slate-300 text-sm mb-1 block">Question Set *</label>
              <select
                value={selectedSet}
                onChange={(e) => setSelectedSet(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Choose a set...</option>
                {sets.map(set => (
                  <option key={set.id} value={set.id}>
                    {set.name} ({set.questions?.length || 0} Qs)
                  </option>
                ))}
              </select>
              {sets.length === 0 && (
                <p className="text-sm text-red-400 mt-2">
                  No sets found. <a href="/teacher/sets" className="text-yellow-400 underline">Create one first</a>
                </p>
              )}
            </div>

            <div>
              <label className="text-slate-300 text-sm mb-1 block">Class *</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Choose a class...</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_name} ({cls.class_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-300 text-sm mb-1 block">Number of Teams</label>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    onClick={() => setTeamCount(n)}
                    className={`px-4 py-2 rounded-lg font-bold ${
                      teamCount === n
                        ? "bg-yellow-500 text-black"
                        : "border border-slate-600 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    👥 {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-slate-300 text-sm">Room Code</label>
                  <div className="text-3xl font-bold text-yellow-400 tracking-wider">{roomCode}</div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(roomCode);
                    setError("Room code copied!");
                    setTimeout(() => setError(""), 2000);
                  }}
                  className="border border-slate-600 text-slate-300 hover:bg-slate-700 px-3 py-1 rounded"
                >
                  Copy
                </button>
              </div>
              <p className="text-sm text-slate-400 mt-2">
                Students join at <span className="text-yellow-400">/student/{roomCode}</span>
              </p>
            </div>

            {selectedSet && (
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-400">🎲</span>
                  <span className="font-bold text-white">{sets.find(s => s.id === selectedSet)?.name}</span>
                </div>
                <div className="text-sm text-slate-400">
                  {sets.find(s => s.id === selectedSet)?.questions?.length || 0} questions • {sets.find(s => s.id === selectedSet)?.subject || "No subject"}
                </div>
              </div>
            )}

            <button
              onClick={launchGame}
              disabled={!selectedSet || !selectedClass}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold text-lg py-4 rounded-lg"
            >
              ▶ Launch Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LaunchUnfairPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    }>
      <LaunchContent />
    </Suspense>
  );
}
