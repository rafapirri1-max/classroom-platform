"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, SkipForward, RotateCcw, Trophy } from "lucide-react";
import { toast } from "sonner";

interface GameState {
  tileUsed: boolean[];
  scores: number[];
  currentTeam: number;
  categoryText: string;
  questionText: string;
  answerText: string;
  answerVisible: boolean;
  resultText: string;
  eventBoxText: string;
  timeLeft: number;
  totalTime: number;
  roundLocked: boolean;
  currentRoundFinished: boolean;
  immunityTeam: number | null;
  gameOver: boolean;
  winnerText: string;
  teamNames: string[];
  currentQuestionIndex: number;
}

interface GameSet {
  id: string;
  name: string;
  questions: { category: string; question: string; answer: string }[];
  settings: {
    timerDuration: number;
    pointValues: number[];
    bossPointValues: number[];
    enableTrap: boolean;
    enableBoss: boolean;
    enableEvent: boolean;
    trapPercent: number;
    bossPercent: number;
    eventPercent: number;
  };
}

function HostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const roomCode = searchParams.get("roomCode");
  const supabase = createClient();

  const [gameSet, setGameSet] = useState<GameSet | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    tileUsed: Array(25).fill(false),
    scores: [0, 0, 0, 0],
    currentTeam: 0,
    categoryText: "",
    questionText: "Select a tile to start!",
    answerText: "",
    answerVisible: false,
    resultText: "",
    eventBoxText: "Welcome to The Unfair Game!",
    timeLeft: 0,
    totalTime: 0,
    roundLocked: false,
    currentRoundFinished: true,
    immunityTeam: null,
    gameOver: false,
    winnerText: "",
    teamNames: ["Team 1", "Team 2", "Team 3", "Team 4"],
    currentQuestionIndex: -1,
  });
  const [loading, setLoading] = useState(true);
  const [tileTypes, setTileTypes] = useState<string[]>([]);

  useEffect(() => {
    if (!sessionId) {
      router.push("/teacher/sets");
      return;
    }
    loadSession();
  }, [sessionId]);

  async function loadSession() {
    const { data: session } = await supabase
      .from("unfair_game_sessions")
      .select("*, game_sets(*)")
      .eq("id", sessionId)
      .single();

    if (!session) {
      toast.error("Session not found");
      router.push("/teacher/sets");
      return;
    }

    setGameSet(session.game_sets);
    
    const teamCount = session.team_names?.length || 4;
    const names = session.team_names || Array.from({ length: teamCount }, (_, i) => `Team ${i + 1}`);
    
    setGameState(prev => ({
      ...prev,
      scores: Array(teamCount).fill(0),
      teamNames: names,
      tileUsed: Array(25).fill(false),
    }));

    const types = generateTileTypes(session.game_sets?.settings);
    setTileTypes(types);
    setLoading(false);
  }

  function generateTileTypes(settings: any) {
    const types = Array(25).fill("normal");
    const trapCount = Math.floor(25 * (settings?.trapPercent || 12) / 100);
    const bossCount = Math.floor(25 * (settings?.bossPercent || 12) / 100);
    const eventCount = Math.floor(25 * (settings?.eventPercent || 12) / 100);

    let available = Array.from({ length: 25 }, (_, i) => i);
    
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }

    let idx = 0;
    for (let i = 0; i < bossCount && idx < available.length; i++) types[available[idx++]] = "boss";
    for (let i = 0; i < trapCount && idx < available.length; i++) types[available[idx++]] = "trap";
    for (let i = 0; i < eventCount && idx < available.length; i++) types[available[idx++]] = "event";

    return types;
  }

  function selectTile(index: number) {
    if (gameState.roundLocked || gameState.tileUsed[index] || gameState.gameOver) return;

    const type = tileTypes[index];
    const newTileUsed = [...gameState.tileUsed];
    newTileUsed[index] = true;

    let points = 0;
    let category = "General";
    let question = "No question available";
    let answer = "";

    if (gameSet && gameSet.questions && gameSet.questions.length > 0) {
      const qIndex = Math.floor(Math.random() * gameSet.questions.length);
      const q = gameSet.questions[qIndex];
      category = q.category || "General";
      question = q.question;
      answer = q.answer;
    }

    const settings = gameSet?.settings;
    const pointValues = settings?.pointValues || [-700, -500, -400, -300, -200, 200, 300, 400, 500, 700];
    const bossValues = settings?.bossPointValues || [-1200, -900, -700, 700, 900, 1200];

    if (type === "boss") {
      points = bossValues[Math.floor(Math.random() * bossValues.length)];
    } else if (type === "trap") {
      points = -Math.abs(pointValues[Math.floor(Math.random() * pointValues.length)]);
    } else if (type === "event") {
      points = pointValues[Math.floor(Math.random() * pointValues.length)];
    } else {
      points = pointValues[Math.floor(Math.random() * pointValues.length)];
    }

    const newScores = [...gameState.scores];
    const currentTeam = gameState.currentTeam;
    
    if (gameState.immunityTeam !== currentTeam) {
      newScores[currentTeam] += points;
    }

    const timerDuration = settings?.timerDuration || 40;

    setGameState(prev => ({
      ...prev,
      tileUsed: newTileUsed,
      scores: newScores,
      categoryText: category,
      questionText: question,
      answerText: answer,
      answerVisible: false,
      resultText: `${points > 0 ? "+" : ""}${points} points!`,
      eventBoxText: `${prev.teamNames[currentTeam]} selected tile ${index + 1} (${type})`,
      timeLeft: timerDuration,
      totalTime: timerDuration,
      roundLocked: true,
      currentRoundFinished: false,
      currentQuestionIndex: index,
    }));

    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.timeLeft <= 1) {
          clearInterval(timer);
          return { ...prev, timeLeft: 0, roundLocked: false, currentRoundFinished: true };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
  }

  function revealAnswer() {
    setGameState(prev => ({ ...prev, answerVisible: true }));
  }

  function nextTurn() {
    if (!gameState.currentRoundFinished) return;

    const allUsed = gameState.tileUsed.every(t => t);
    if (allUsed) {
      const winner = gameState.scores.indexOf(Math.max(...gameState.scores));
      setGameState(prev => ({
        ...prev,
        gameOver: true,
        winnerText: `🏆 ${prev.teamNames[winner]} wins with ${prev.scores[winner]} points!`,
      }));
      return;
    }

    setGameState(prev => ({
      ...prev,
      currentTeam: (prev.currentTeam + 1) % prev.teamNames.length,
      roundLocked: false,
      currentRoundFinished: true,
      categoryText: "",
      questionText: "Select a tile!",
      answerText: "",
      answerVisible: false,
      resultText: "",
      eventBoxText: `${prev.teamNames[(prev.currentTeam + 1) % prev.teamNames.length]}'s turn!`,
    }));
  }

  function endGame() {
    const winner = gameState.scores.indexOf(Math.max(...gameState.scores));
    setGameState(prev => ({
      ...prev,
      gameOver: true,
      winnerText: `🏆 ${prev.teamNames[winner]} wins with ${prev.scores[winner]} points!`,
    }));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  if (gameState.gameOver) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-lg mx-auto text-center pt-12">
          <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-white mb-4">Game Over!</h1>
          <p className="text-slate-400 mb-8 text-xl">{gameState.winnerText}</p>

          <div className="space-y-3">
            {gameState.scores
              .map((s, i) => ({ score: s, name: gameState.teamNames[i], index: i }))
              .sort((a, b) => b.score - a.score)
              .map((item, rank) => (
                <Card key={item.index} className={`p-4 ${
                  rank === 0 ? "bg-yellow-400/10 border-yellow-400/30" : "bg-slate-800/50 border-slate-700"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-xl font-bold ${rank === 0 ? "text-yellow-400" : "text-slate-400"}`}>
                        #{rank + 1}
                      </span>
                      <span className="font-bold text-white text-lg">{item.name}</span>
                    </div>
                    <span className={`text-2xl font-bold ${item.score >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {item.score > 0 ? "+" : ""}{item.score}
                    </span>
                  </div>
                </Card>
              ))}
          </div>

          <Button
            onClick={() => router.push("/teacher/sets")}
            className="mt-8 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">The Unfair Game</h1>
            <p className="text-slate-400 text-sm">Room: <span className="text-yellow-400 font-mono">{roomCode}</span></p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={endGame} className="border-red-500 text-red-400 hover:bg-red-500/20">
              End Game
            </Button>
            <Button variant="outline" onClick={() => router.push("/teacher/sets")} className="border-slate-600 text-slate-300">
              <ArrowLeft className="w-4 h-4 mr-1" /> Exit
            </Button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {gameState.scores.map((score, i) => (
            <Card
              key={i}
              className={`min-w-[130px] p-3 ${
                i === gameState.currentTeam
                  ? "border-yellow-400 shadow-lg shadow-yellow-400/20"
                  : "border-slate-700"
              } ${i === gameState.immunityTeam ? "ring-2 ring-blue-400" : ""}`}
            >
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs font-bold text-slate-400 truncate">{gameState.teamNames[i]}</span>
                {i === gameState.immunityTeam && <Badge className="bg-blue-500 text-white text-xs">Shield</Badge>}
              </div>
              <div className={`text-xl font-bold ${score >= 0 ? "text-green-400" : "text-red-400"}`}>
                {score > 0 ? "+" : ""}{score}
              </div>
            </Card>
          ))}
        </div>

        <Card className="bg-slate-800/30 border-slate-700 p-3 mb-4">
          <div className="grid grid-cols-5 gap-2">
            {gameState.tileUsed.map((used, i) => {
              const type = tileTypes[i] || "normal";
              const display = type === "boss" ? "☠" : type === "trap" ? "⚠" : type === "event" ? "★" : i + 1;

              return (
                <button
                  key={i}
                  onClick={() => selectTile(i)}
                  disabled={used || gameState.roundLocked}
                  className={`h-16 rounded-lg font-bold text-lg flex items-center justify-center transition-all ${
                    used
                      ? "bg-slate-700 text-slate-500 cursor-default"
                      : type === "boss"
                      ? "bg-gradient-to-b from-red-800 to-red-900 text-white hover:from-red-700 hover:to-red-800"
                      : type === "trap"
                      ? "bg-gradient-to-b from-yellow-500 to-yellow-600 text-black hover:from-yellow-400 hover:to-yellow-500"
                      : type === "event"
                      ? "bg-gradient-to-b from-cyan-500 to-cyan-600 text-white hover:from-cyan-400 hover:to-cyan-500"
                      : "bg-gradient-to-b from-yellow-400 to-yellow-500 text-black hover:from-yellow-300 hover:to-yellow-400"
                  } ${gameState.roundLocked && !used ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {used ? i + 1 : display}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 p-4">
          <div className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-2">
            {gameState.categoryText || "SELECT A TILE"}
          </div>

          {gameState.roundLocked && (
            <div className="mb-3">
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-1000"
                  style={{
                    width: `${Math.max(0, (gameState.timeLeft / gameState.totalTime) * 100)}%`,
                    background: gameState.timeLeft <= 10 ? "#ef4444" : "#22c55e",
                  }}
                />
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                ⏱️ {gameState.timeLeft}s
              </div>
            </div>
          )}

          <div className="bg-slate-900 rounded-xl p-4 min-h-[100px] flex items-center justify-center text-center text-white mb-3">
            {gameState.questionText}
          </div>

          {gameState.answerVisible && (
            <div className="bg-slate-700/50 rounded-xl p-4 text-slate-200 mb-3">
              {gameState.answerText}
            </div>
          )}

          {gameState.resultText && (
            <div className="text-center text-2xl font-bold text-yellow-400 mb-3">
              {gameState.resultText}
            </div>
          )}

          <div className="bg-slate-900/50 rounded-xl p-3 text-sm text-slate-300">
            {gameState.eventBoxText}
          </div>

          <div className="flex gap-2 mt-4">
            {gameState.roundLocked && !gameState.answerVisible && (
              <Button onClick={revealAnswer} className="bg-blue-600 hover:bg-blue-700 text-white">
                Reveal Answer
              </Button>
            )}
            {gameState.roundLocked && gameState.answerVisible && !gameState.currentRoundFinished && (
              <Button onClick={() => setGameState(prev => ({ ...prev, currentRoundFinished: true, roundLocked: false }))} className="bg-green-600 hover:bg-green-700 text-white">
                <SkipForward className="w-4 h-4 mr-1" /> Skip Timer
              </Button>
            )}
            {gameState.currentRoundFinished && (
              <Button onClick={nextTurn} className="bg-purple-600 hover:bg-purple-700 text-white">
                <RotateCcw className="w-4 h-4 mr-1" /> Next Turn
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function TeacherHostPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    }>
      <HostContent />
    </Suspense>
  );
}
