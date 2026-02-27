import { useState, useEffect, useRef, useCallback } from "react";

const TIMER_DURATION = 300; // 5 minutes in seconds

const PLAY_TYPES = [
  { label: "Out", points: 1, type: "fielding", icon: "🧤", color: "bg-red-600 hover:bg-red-700 active:bg-red-800" },
  { label: "Single", points: 1, type: "batting", icon: "1B", color: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800" },
  { label: "Double", points: 2, type: "batting", icon: "2B", color: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800" },
  { label: "Triple", points: 3, type: "batting", icon: "3B", color: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800" },
  { label: "Home Run", points: 4, type: "batting", icon: "HR", color: "bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800" },
  { label: "Run Scored", points: 1, type: "batting", icon: "🏠", color: "bg-green-600 hover:bg-green-700 active:bg-green-800" },
];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AstrosPointsGame() {
  const [teamA, setTeamA] = useState({ name: "Team 1", score: 0 });
  const [teamB, setTeamB] = useState({ name: "Team 2", score: 0 });
  const [battingTeam, setBattingTeam] = useState("A");
  const [inning, setInning] = useState(1);
  const [isTopHalf, setIsTopHalf] = useState(true);
  const [timer, setTimer] = useState(TIMER_DURATION);
  const [timerRunning, setTimerRunning] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [playLog, setPlayLog] = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [editingName, setEditingName] = useState(null);
  const timerRef = useRef(null);
  const [flashScore, setFlashScore] = useState(null);

  useEffect(() => {
    if (timerRunning && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            setTimerRunning(false);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  useEffect(() => {
    if (timer === 0 && gameStarted) {
      if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
    }
  }, [timer, gameStarted]);

  const batting = battingTeam === "A" ? teamA : teamB;
  const fielding = battingTeam === "A" ? teamB : teamA;
  const setBatting = battingTeam === "A" ? setTeamA : setTeamB;
  const setFielding = battingTeam === "A" ? setTeamB : setTeamA;

  const recordPlay = useCallback(
    (play) => {
      const team = play.type === "batting" ? batting : fielding;
      const setTeam = play.type === "batting" ? setBatting : setFielding;
      const side = play.type === "batting" ? battingTeam : (battingTeam === "A" ? "B" : "A");

      setTeam((prev) => ({ ...prev, score: prev.score + play.points }));
      setFlashScore(side);
      setTimeout(() => setFlashScore(null), 400);

      setPlayLog((prev) => [
        {
          id: Date.now(),
          inning,
          half: isTopHalf ? "Top" : "Bot",
          team: team.name,
          play: play.label,
          points: play.points,
          type: play.type,
          timeRemaining: formatTime(timer),
        },
        ...prev,
      ]);
    },
    [batting, fielding, setBatting, setFielding, battingTeam, inning, isTopHalf, timer]
  );

  const undoLastPlay = useCallback(() => {
    if (playLog.length === 0) return;
    const last = playLog[0];
    const isTeamA = last.team === teamA.name;

    if (isTeamA) {
      setTeamA((prev) => ({ ...prev, score: Math.max(0, prev.score - last.points) }));
    } else {
      setTeamB((prev) => ({ ...prev, score: Math.max(0, prev.score - last.points) }));
    }
    setPlayLog((prev) => prev.slice(1));
  }, [playLog, teamA.name, teamB.name]);

  const switchSides = () => {
    setTimerRunning(false);
    setTimer(TIMER_DURATION);
    if (!isTopHalf) {
      setInning((i) => i + 1);
    }
    setIsTopHalf((h) => !h);
    setBattingTeam((t) => (t === "A" ? "B" : "A"));
  };

  const startGame = () => {
    setShowSetup(false);
    setGameStarted(true);
  };

  const resetGame = () => {
    setTeamA((prev) => ({ ...prev, score: 0 }));
    setTeamB((prev) => ({ ...prev, score: 0 }));
    setBattingTeam("A");
    setInning(1);
    setIsTopHalf(true);
    setTimer(TIMER_DURATION);
    setTimerRunning(false);
    setGameStarted(false);
    setPlayLog([]);
    setShowSetup(true);
  };

  const timerColor =
    timer === 0
      ? "text-red-400"
      : timer <= 30
      ? "text-yellow-400"
      : "text-white";

  const timerBg =
    timer === 0
      ? "bg-red-900/50 border-red-500"
      : timer <= 30
      ? "bg-yellow-900/30 border-yellow-600"
      : "border-slate-600";

  if (showSetup) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">⚾</div>
            <h1 className="text-2xl font-bold text-white">Points Game</h1>
            <p className="text-slate-400 mt-1 text-sm">26 Astros Practice</p>
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                Team 1 (Bats First)
              </label>
              <input
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-blue-500"
                value={teamA.name}
                onChange={(e) => setTeamA((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Team 1 Name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                Team 2
              </label>
              <input
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-blue-500"
                value={teamB.name}
                onChange={(e) => setTeamB((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Team 2 Name"
              />
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4 mb-8 text-sm text-slate-300">
            <h3 className="font-semibold text-white mb-2">Scoring Rules</h3>
            <div className="grid grid-cols-2 gap-1.5">
              <div>🧤 Out → 1 pt <span className="text-slate-500">(fielding)</span></div>
              <div>1B Single → 1 pt</div>
              <div>2B Double → 2 pts</div>
              <div>3B Triple → 3 pts</div>
              <div>HR Home Run → 4 pts</div>
              <div>🏠 Run Scored → 1 pt</div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-700 text-slate-400">
              ⏱ 5 min per half-inning • No 3-out rule
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold text-lg py-4 rounded-xl transition-colors"
          >
            Start Game ⚾
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="bg-slate-800 border-b border-slate-700 px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Inning {inning} • {isTopHalf ? "Top" : "Bottom"}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLog(!showLog)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-700"
            >
              Play by Play {showLog ? "Off" : "On"} ({playLog.length})
            </button>
            <button
              onClick={resetGame}
              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-slate-700"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 items-center gap-2">
          <div
            className={`text-center rounded-lg p-2 transition-all ${
              battingTeam === "A"
                ? "bg-blue-900/40 ring-1 ring-blue-500"
                : "bg-slate-700/50"
            } ${flashScore === "A" ? "scale-105" : ""}`}
          >
            <div className="text-xs text-slate-400 truncate">
              {battingTeam === "A" ? "🏏 BAT" : "🧤 FLD"}
            </div>
            <div className="font-bold text-sm truncate">{teamA.name}</div>
            <div className="text-3xl font-black tabular-nums">{teamA.score}</div>
          </div>

          <div className="text-center">
            <div className="text-slate-500 font-bold text-sm">VS</div>
          </div>

          <div
            className={`text-center rounded-lg p-2 transition-all ${
              battingTeam === "B"
                ? "bg-blue-900/40 ring-1 ring-blue-500"
                : "bg-slate-700/50"
            } ${flashScore === "B" ? "scale-105" : ""}`}
          >
            <div className="text-xs text-slate-400 truncate">
              {battingTeam === "B" ? "🏏 BAT" : "🧤 FLD"}
            </div>
            <div className="font-bold text-sm truncate">{teamB.name}</div>
            <div className="text-3xl font-black tabular-nums">{teamB.score}</div>
          </div>
        </div>
      </div>

      <div className={`border-b ${timerBg} px-3 py-3`}>
        <div className="flex items-center justify-between">
          <div className={`text-4xl font-black tabular-nums ${timerColor}`}>
            {formatTime(timer)}
          </div>
          <div className="flex gap-2">
            {timer > 0 ? (
              <button
                onClick={() => setTimerRunning(!timerRunning)}
                className={`px-5 py-2 rounded-lg font-bold text-sm transition-colors ${
                  timerRunning
                    ? "bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800"
                    : "bg-green-600 hover:bg-green-700 active:bg-green-800"
                }`}
              >
                {timerRunning ? "⏸ Pause" : "▶ Start"}
              </button>
            ) : (
              <div className="text-red-400 font-bold text-sm px-3 py-2 animate-pulse">
                ⏰ TIME!
              </div>
            )}
            <button
              onClick={() => {
                setTimer(TIMER_DURATION);
                setTimerRunning(false);
              }}
              className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
            >
              ↺
            </button>
          </div>
        </div>
        {timer === 0 && (
          <p className="text-xs text-red-400 mt-1">
            Finish current at-bat, then switch sides
          </p>
        )}
      </div>

      {showLog && (
        <div className="bg-slate-800/80 border-b border-slate-700 max-h-48 overflow-y-auto">
          {playLog.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-3">No plays yet</p>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {playLog.map((entry, i) => (
                <div key={entry.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">
                      {entry.half} {entry.inning}
                    </span>
                    <span className="text-slate-300">{entry.team}</span>
                    <span
                      className={
                        entry.type === "fielding" ? "text-red-400" : "text-blue-400"
                      }
                    >
                      {entry.play}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 font-mono">+{entry.points}</span>
                    <span className="text-slate-600">{entry.timeRemaining}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 p-3 flex flex-col gap-2">
        <div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
            🏏 {batting.name} batting
          </div>
          <div className="grid grid-cols-3 gap-2">
            {PLAY_TYPES.filter((p) => p.type === "batting").map((play) => (
              <button
                key={play.label}
                onClick={() => recordPlay(play)}
                className={`${play.color} rounded-xl py-4 px-2 text-center transition-all active:scale-95`}
              >
                <div className="text-xl font-black">{play.icon}</div>
                <div className="text-xs font-medium mt-0.5">{play.label}</div>
                <div className="text-xs text-white/70">+{play.points} pt{play.points > 1 ? "s" : ""}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
            🧤 {fielding.name} fielding
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => recordPlay(PLAY_TYPES[0])}
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl py-4 px-2 text-center transition-all active:scale-95 col-span-3"
            >
              <div className="text-xl font-black">🧤</div>
              <div className="text-xs font-medium mt-0.5">Out Recorded</div>
              <div className="text-xs text-white/70">+1 pt for {fielding.name}</div>
            </button>
          </div>
        </div>

        <div className="flex-1" />

        <div className="space-y-2 pb-2">
          {playLog.length > 0 && (
            <button
              onClick={undoLastPlay}
              className="w-full py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium transition-colors"
            >
              ↩ Undo Last ({playLog[0]?.play})
            </button>
          )}
          <button
            onClick={switchSides}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-base transition-colors"
          >
            🔄 Switch Sides → {isTopHalf ? "Bottom" : `Top of ${inning + 1}`}
          </button>
        </div>
      </div>
    </div>
  );
}
