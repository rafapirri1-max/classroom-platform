# Classroom Platform v2.0

## Plugin-Based Architecture

### Adding a New Game (2 Steps)

1. Create folder `app/games/my-game/`
2. Add 2 files:

**game.json:**
```json
{
  "id": "my-game",
  "name": "My Game",
  "icon": "🎮",
  "description": "Description here",
  "difficulty": "easy",
  "minPlayers": 1,
  "maxPlayers": 50,
  "duration": "10 min",
  "tracking": true
}
```

**index.html:**
```html
<!DOCTYPE html>
<html>
<head><title>My Game</title></head>
<body>
  <h1>My Game</h1>
  <script>
    // Send scores to parent when done
    window.parent.postMessage({
      type: 'GAME_COMPLETE',
      score: 850,
      accuracy: 85
    }, '*');
  </script>
</body>
</html>
```

3. Commit → push → done. Teacher dashboard auto-discovers it.

### File Structure

```
app/
├── games/
│   └── bias-detective/
│       ├── game.json          ← Config
│       └── index.html         ← Game file (YOUR bias game goes here)
├── teacher/room/[id]/         ← Auto-discovers games, never touch
├── student/[roomId]/            ← Loads any game by ID, never touch
├── api/games/                   ← Returns list of all games
└── api/track/                   ← Universal tracking for all games
```

### Supabase Tables (Already Created)

- `students` - user accounts
- `classes` - teacher classes
- `class_enrollments` - student-class links
- `rooms` - live session rooms
- `participants` - who's in each room
- `game_sessions` - every game play
- `question_attempts` - every answer
- `badges` - achievement definitions
- `student_badges` - earned achievements

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://dxjvkyhywczrtlbizpso.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_QHDy3nZo1YRGknw7ZsEXuA_08aKKCIy
```
