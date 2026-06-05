# Classroom Platform v2.0

Interactive classroom platform for live game sessions, built with Next.js and Supabase.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template and add your Supabase credentials:

```bash
cp .env.example .env.local
```

3. Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these values from your [Supabase project settings](https://supabase.com/dashboard/project/_/settings/api).

4. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Plugin-Based Architecture

Games live in `public/games/` because the student room loads them as static files at `/games/{id}/index.html`. The teacher dashboard discovers games by reading each folder's `game.json`.

### Adding a New Game

1. Create folder `public/games/my-game/`
2. Add two files:

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
    window.parent.postMessage({
      type: 'GAME_SUBMIT',
      data: {
        score: 850,
        accuracy_percent: 85,
        time_spent_seconds: 120,
        quiz_answers: [],
        scenario_answers: []
      }
    }, '*');
  </script>
</body>
</html>
```

3. Restart the dev server if it is already running. The teacher dashboard auto-discovers the new game.

### File Structure

```
public/
└── games/
    └── bias-detective/
        ├── game.json          ← Config (used by /api/games)
        └── index.html         ← Game file served to students

app/
├── teacher/room/[id]/         ← Auto-discovers games, never touch
├── student/[roomId]/          ← Loads any game by ID, never touch
├── api/games/                 ← Returns list of all games
└── api/track/                 ← Universal tracking for all games
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
