"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Play, Users, Clock, Settings, Dices } from "lucide-react";
import { toast } from "sonner";

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

export default function LaunchUnfairPage() {
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

    // Load sets
    const { data: setsData } = await supabase
      .from("game_sets")
      .select("*")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });
    setSets(setsData || []);

    // Load classes
    const { data: classesData } = await supabase
      .from("classes")
      .select("id, class_name, class_code")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });
    setClasses(classesData || []);

    // Generate room code
    setRoomCode(generateRoomCode());
    setLoading(false);
  }

  function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async function launchGame() {
    if (!selectedSet) {
      toast.error("Select a question set");
      return;
    }
    if (!selectedClass) {
      toast.error("Select a class");
      return;
    }

    const set = sets.find(s => s.id === selectedSet);
    if (!set) {
      toast.error("Set not found");
      return;
    }

    // Create session record
    const { data: session, error } = await supabase
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

    if (error) {
      toast.error("Failed to launch: " + error.message);
      return;
    }

    // Navigate to the game host page
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
        <Button
          variant="ghost"
          onClick={() => router.push("/teacher/sets")}
          className="text-slate-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to My Sets
        </Button>

        <h1 className="text-3xl font-bold text-white mb-2">Launch Unfair Game</h1>
        <p className="text-slate-400 mb-8">Configure your game and share the room code with students</p>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Game Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question Set */}
            <div>
              <Label className="text-slate-300 mb-2 block">Question Set *</Label>
              <Select value={selectedSet} onValueChange={setSelectedSet}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Choose a set..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {sets.map(set => (
                    <SelectItem key={set.id} value={set.id} className="text-white hover:bg-slate-600">
                      <div className="flex items-center gap-2">
                        <span>{set.name}</span>
                        <Badge variant="outline" className="text-xs">{set.questions?.length || 0} Qs</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sets.length === 0 && (
                <p className="text-sm text-red-400 mt-2">
                  No sets found. <Button variant="link" onClick={() => router.push("/teacher/sets")} className="text-yellow-400 p-0 h-auto">Create one first</Button>
                </p>
              )}
            </div>

            {/* Class */}
            <div>
              <Label className="text-slate-300 mb-2 block">Class *</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Choose a class..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id} className="text-white hover:bg-slate-600">
                      {cls.class_name} ({cls.class_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Teams */}
            <div>
              <Label className="text-slate-300 mb-2 block">Number of Teams</Label>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map(n => (
                  <Button
                    key={n}
                    variant={teamCount === n ? "default" : "outline"}
                    onClick={() => setTeamCount(n)}
                    className={teamCount === n 
                      ? "bg-yellow-500 text-black font-bold" 
                      : "border-slate-600 text-slate-300 hover:bg-slate-700"
                    }
                  >
                    <Users className="w-4 h-4 mr-1" /> {n}
                  </Button>
                ))}
              </div>
            </div>

            {/* Room Code */}
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300 text-sm">Room Code</Label>
                  <div className="text-3xl font-bold text-yellow-400 tracking-wider">{roomCode}</div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(roomCode);
                    toast.success("Room code copied!");
                  }}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Copy
                </Button>
              </div>
              <p className="text-sm text-slate-400 mt-2">
                Students join at <span className="text-yellow-400">/student/{roomCode}</span>
              </p>
            </div>

            {/* Selected Set Preview */}
            {selectedSet && (
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                <div className="flex items-center gap-2 mb-2">
                  <Dices className="w-5 h-5 text-yellow-400" />
                  <span className="font-bold text-white">{sets.find(s => s.id === selectedSet)?.name}</span>
                </div>
                <div className="flex gap-4 text-sm text-slate-400">
                  <span>{sets.find(s => s.id === selectedSet)?.questions?.length || 0} questions</span>
                  <span>•</span>
                  <span>{sets.find(s => s.id === selectedSet)?.subject || "No subject"}</span>
                </div>
              </div>
            )}

            <Button
              onClick={launchGame}
              disabled={!selectedSet || !selectedClass}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-lg py-6"
            >
              <Play className="w-5 h-5 mr-2" /> Launch Game
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
