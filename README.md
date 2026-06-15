# XAlgo.

A real-time competitive coding platform where two players are matched against each other to solve algorithmic problems under a time limit. The player who passes more test cases wins and earns XP.

---

## Features

- **1v1 Matchmaking** — Players enter a queue and are matched with another available opponent in real time
- **Live Coding Arena** — In-browser code editor (Monaco) with C++ support and a 20-minute match timer
- **Test Case Evaluation** — Code is evaluated against hidden test cases; progress is tracked per player
- **XP & Leaderboard System** — Winners earn XP, losers lose XP; a live leaderboard ranks all players
- **Forfeit Detection** — If a player leaves mid-match, they receive a penalty and the opponent is awarded the win
- **User Profiles** — Stats including duels played, wins, current streak, XP, gold coins, and dynamic level
- **JWT Authentication** — Secure login and registration with hashed passwords
- **Problem of the Day** — Daily coding challenge surfaced on the dashboard
- **Polling-based Real-time Updates** — Match state and opponent progress synced via HTTP polling

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + Vite | UI framework and build tool |
| Tailwind CSS v4 | Styling |
| React Router v7 | Client-side routing |
| Monaco Editor | In-browser code editor |
| Axios | HTTP client |
| Framer Motion | Animations |
| Lucide React | Icons |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express 5 | REST API server |
| MongoDB + Mongoose | Database and ODM |
| Redis | Match queue and session management |
| JWT + bcryptjs | Authentication and password hashing |
| UUID | Unique match room ID generation |
| dotenv | Environment variable management |

---

## Project Structure

```
XAlgo./
├── backend/
│   └── src/
│       ├── controllers/
│       │   ├── authController.js       # Register, login, JWT issuing
│       │   ├── matchController.js      # Queue, matchmaking, forfeit, submit
│       │   └── problemController.js    # Problem CRUD and test case evaluation
│       ├── models/
│       │   ├── User.js                 # User schema (XP, stats, level virtual)
│       │   ├── Match.js                # Match schema (players, status, progress)
│       │   └── Problem.js              # Problem schema (test cases, difficulty)
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── matchRoutes.js
│       │   └── problemRoutes.js
│       └── index.js                    # App entry, DB connect, server bootstrap
│
└── frontend/
    └── src/
        ├── context/
        │   ├── AuthContext.jsx          # Global auth state and token management
        │   └── GameContext.jsx          # Match state, polling, timer, forfeit logic
        ├── components/
        │   ├── IsolatedEditor.jsx       # Monaco code editor panel
        │   ├── BattleStatusMatrix.jsx   # Problem viewer and opponent tracker
        │   ├── PostGameModal.jsx        # End-of-match results and XP summary
        │   ├── GlobalHeader.jsx         # Top navigation with user info
        │   └── NavigationHeader.jsx     # Secondary navigation
        ├── views/
        │   ├── ArenaView.jsx            # Full match screen (editor + problem)
        │   ├── LoginView.jsx            # Login and register page
        │   └── ProfileView.jsx          # User profile and stats
        ├── pages/
        │   ├── Arena.jsx                # Arena page wrapper
        │   └── Dashboard.jsx           # Dashboard with queue, POTD, leaderboard
        └── App.jsx                      # Routes definition
```

---

## Getting Started

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)
- Redis (local or cloud)

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
REDIS_URL=your_redis_url
```

Start the backend:

```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at `http://localhost:5173` and the backend at `http://localhost:5000`.

---

## How a Match Works

1. Player clicks **Join Queue** on the Dashboard
2. Backend polls Redis for an available opponent
3. When two players are in the queue, a match room is created with a unique ID and a random problem is assigned
4. Both players are redirected to the **Arena** — a 20-minute countdown begins
5. Players write and submit code; test cases are evaluated server-side
6. The player with more passing test cases at the end wins
7. XP is awarded to the winner and deducted from the loser
8. If a player leaves early, they forfeit — the opponent wins automatically

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/auth/me` | Get current user profile |

### Match
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/match/join-queue` | Enter the matchmaking queue |
| GET | `/api/match/status` | Poll current match state |
| POST | `/api/match/submit` | Submit code for evaluation |
| POST | `/api/match/forfeit` | Forfeit the current match |
| GET | `/api/match/leaderboard` | Get top players by XP |

### Problems
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/problems` | List all problems |
| GET | `/api/problems/daily` | Get Problem of the Day |
| GET | `/api/problems/:id` | Get a single problem |
