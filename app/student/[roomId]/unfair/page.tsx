"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

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
}

function StudentUnfairContent() {
  const params = useParams();
  const roomId = params.roomId as string;
  const supabase = createClient();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [tileTypes, setTileTypes] = useState<string[]>([]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room_${roomId}`)
      .on("broadcast", { event: "game_state" }, ({ payload }) => {
        setGameState(payload);
        setConnected(true);
      })
      .on("broadcast", { event: "tile_types" }, ({ payload }) => {
        setTileTypes(payload.tileTypes);
      })
      .subscribe();

    channel.send({
      type: "broadcast",
      event: "student_join",
      payload: {},
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Connecting to game...</p>
          <p className="text-sm text-slate-500 mt-2">Room: {roomId}</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <p className="text-slate-400">Waiting for teacher to start...</p>
      </div>
    );
  }

  if (gameState.gameOver) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-lg mx-auto text-center pt-12">
          <div className="text-6xl mb-6">🏆</div>
          <h1 className="text-4xl font-bold text-white mb-4">{gameState.winnerText.split("\n")[0]}</h1>
          <p className="text-slate-400 mb-8">{gameState.winnerText.split("\n")[1]}</p>

          <div className="space-y-3">
            {gameState.scores
              .map((s, i) => ({ score: s, name: gameState.teamNames[i], index: i }))
              .sort((a, b) => b.score - a.score)
              .map((item, rank) => (
                <div key={item.index} className={`p-4 rounded-lg border ${
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
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-white">The Unfair Game</h1>
          <p className="text-sm text-slate-400">Room: <span className="text-yellow-400">{roomId}</span></p>
        </div>
        <div className="border border-green-400/30 text-green-400 px-2 py-1 rounded text-sm">
          ● Live
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {gameState.scores.map((score, i) => (
          <div
            key={i}
            className={`min-w-[130px] p-3 rounded-lg border ${
              i === gameState.currentTeam
                ? "border-yellow-400 shadow-lg shadow-yellow-400/20"
                : "border-slate-700"
            } ${i === gameState.immunityTeam ? "ring-2 ring-blue-400" : ""}`}
          >
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs font-bold text-slate-400 truncate">{gameState.teamNames[i]}</span>
              {i === gameState.immunityTeam && <span className="text-blue-400 text-xs">🛡</span>}
            </div>
            <div className={`text-xl font-bold ${score >= 0 ? "text-green-400" : "text-red-400"}`}>
              {score > 0 ? "+" : ""}{score}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/30 rounded-2xl border border-slate-700 p-3 mb-4">
        <div className="grid grid-cols-5 gap-2">
          {gameState.tileUsed.map((used, i) => {
            const type = tileTypes[i] || "normal";
            const display = type === "boss" ? "☠" : type === "trap" ? "⚠" : type === "event" ? "★" : i + 1;

            return (
              <div
                key={i}
                className={`h-16 rounded-lg font-bold text-lg flex items-center justify-center ${
                  used
                    ? "bg-slate-700 text-slate-500"
                    : type === "boss"
                    ? "bg-gradient-to-b from-red-800 to-red-900 text-white"
                    : type === "trap"
                    ? "bg-gradient-to-b from-yellow-500 to-yellow-600 text-black"
                    : type === "event"
                    ? "bg-gradient-to-b from-cyan-500 to-cyan-600 text-white"
                    : "bg-gradient-to-b from-yellow-400 to-yellow-500 text-black"
                }`}
              >
                {used ? i + 1 : display}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-2">
          {gameState.categoryText}
        </div>

        {gameState.roundLocked && !gameState.currentRoundFinished && (
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
      </div>

      <div className="mt-4 text-center">
        <p className="text-slate-400 text-sm">
          Current turn: <span className="text-yellow-400 font-bold">{gameState.teamNames[gameState.currentTeam]}</span>
        </p>
      </div>
    </div>
  );
}

export default function StudentUnfairView() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    }>
      <StudentUnfairContent />
    </Suspense>
  );
}
