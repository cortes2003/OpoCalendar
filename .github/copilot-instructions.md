# OpoCalendar - AI Agent Instructions

## Project Overview
OpoCalendar is a full-stack study planner for competitive exam candidates ("opositores"). The system uses a Python-based AI engine to automatically reorganize daily schedules by filling time gaps with flexible study tasks while respecting fixed commitments (classes, meals) and user-defined breaks.

**Architecture**: Monorepo with separate backend (Python/FastAPI) and frontend (React/TypeScript/Vite) services communicating via REST API.

## Critical Architecture Decisions

### Backend: `backend/` (Python FastAPI)
- **Database**: MySQL with SQLAlchemy ORM. Connection configured in `database.py` - **IMPORTANT**: Users must manually edit credentials (USUARIO, PASSWORD, HOST) before first run.
- **Auto-migration**: Tables are created automatically on startup via `models.Base.metadata.create_all(bind=engine)` in `main.py` - no separate migration tool.
- **AI Service** (`ai_service.py`): **Custom heuristic algorithm** (NOT an LLM wrapper):
  - Uses `pandas`/`numpy` for gap-filling logic with mathematical time calculations
  - Separates tasks into "fixed" (immovable) and "flexible" (can be rescheduled)
  - Merges user-defined break intervals with fixed tasks to create blocking zones
  - Fills gaps using priority-sorted flexible tasks (high→medium→low, then by duration)
  - Returns proposals WITHOUT saving - requires separate `/optimize/apply` endpoint to commit changes
- **Pydantic V2 Patterns**: Use modern syntax (`model_config = ConfigDict(from_attributes=True)`, `model_dump()` instead of `dict()`)

### Frontend: `frontend/src/` (React + TypeScript)
- **State Management**: Uses custom `useStickyState` hook (localStorage-backed) for user settings persistence across sessions.
- **API Layer** (`api.ts`) - **ADAPTER PATTERN (CRITICAL)**:
  - Acts as translation layer between backend/frontend conventions
  - Hardcoded to `http://localhost:8000` - no environment variables
  - **Time format conversion**: Backend expects `HH:MM:SS`, frontend HTML inputs work with `HH:MM`
    - ALWAYS use `formatTimeForDb()` helper before sending to backend
    - ALWAYS use `formatTimeForInput()` helper when receiving from backend
    - NEVER replicate this conversion logic elsewhere
  - **Naming convention**: Maintains `snake_case` (NOT camelCase) for all API-facing properties to match Python backend
- **Date Handling**: Uses `date-fns` library with Spanish locale (`es`) for all date operations.
- **Single Component Architecture**: Entire app in `App.tsx` (332 lines) - no component splitting yet.
- **Styling**: Tailwind CSS v4 (oxide engine) - configuration syntax differs from v3

## Key Developer Workflows

### Starting the Development Environment
**Prerequisites**: Requires 3 components running simultaneously:
1. **MySQL Service** (External - XAMPP, local installation, or Docker)
2. **Backend** (Python/FastAPI)
3. **Frontend** (React/Vite)

**Backend** (must start before frontend):
```powershell
cd backend
.\venv\Scripts\Activate       # Activate virtual environment
uvicorn main:app --reload --reload-exclude 'venv/*'
# Server: http://127.0.0.1:8000
# API Docs: http://127.0.0.1:8000/docs
```

**Frontend**:
```powershell
cd frontend
npm run dev
# Server: http://localhost:5173
```

### Testing Patterns

#### Backend Testing (pytest)
- **SQLite In-Memory Mock Pattern**: Tests use SQLite (`sqlite://`) instead of MySQL to avoid touching production database
- See `test_main.py` for reference implementation:
  ```python
  # Override get_db dependency with SQLite session
  app.dependency_overrides[get_db] = override_get_db
  ```
- Use `StaticPool` for thread-safe in-memory database
- Tables are auto-created in test setup: `Base.metadata.create_all(bind=engine)`

#### Frontend Testing (Vitest + React Testing Library)
- **API Mock Pattern**: Mock `api.ts` using `vi.mock('./api')` - NEVER make real network requests in tests
- Configuration in `vite.config.ts` uses `vitest/config` import (not `vite`)
- Setup file: `src/setupTests.ts` configures jsdom environment
- Run tests: `npm run test`

## Project-Specific Conventions

### Naming Patterns
- **Backend**: Python `snake_case` everywhere (models, schemas, API responses)
- **Frontend**: TypeScript uses `snake_case` for API-facing properties to match backend (e.g., `start_time`, `is_fixed`), not camelCase
- **Task Types**: Enum values use underscores where needed: `"class"`, `"break_"` (note trailing underscore to avoid Python keyword)

### Time Format and Conversion (CRITICAL)
Backend stores times as `TIME` SQL type but FastAPI serializes to `"HH:MM:SS"`. Frontend HTML time inputs work with `"HH:MM"`.

**The Adapter Pattern in `api.ts` handles this friction:**
```typescript
const formatTimeForInput = (timeStr: string) => timeStr.slice(0, 5);  // "09:00:00" → "09:00"
const formatTimeForDb = (timeStr: string) => timeStr.length === 5 ? `${timeStr}:00` : timeStr;  // "09:00" → "09:00:00"
```

**Rules:**
- When READING from backend: Always strip seconds using `formatTimeForInput()`
- When WRITING to backend: Always add seconds using `formatTimeForDb()`
- NEVER replicate this logic outside `api.ts` - all time conversions must go through this adapter layer
- Backend AI logic uses `time_to_minutes()` helper to convert `datetime.time` to integer minutes since midnight for calculations

### AI Optimization Flow (Two-Step Pattern)
1. **Calculate** (`POST /optimize/calculate/{date}`): Returns `TaskProposal[]` with suggested changes
2. **Apply** (`POST /optimize/apply`): Accepts proposals and commits to database
This allows frontend to show preview before saving. When editing AI logic, maintain this separation.

### Enums and Type Safety
- Backend defines authoritative enums in `models.py` (TaskType, Priority)
- Schemas (`schemas.py`) import from models - single source of truth
- Frontend mirrors these as TypeScript union types in `types.ts` - keep synchronized manually

## Integration Points

### CORS Configuration
Backend whitelist in `main.py`: `allow_origins=["http://localhost:5173"]`  
Add production URLs here when deploying.

### Database Schema
Key columns in `Task` model:
- `is_fixed`: Boolean flag determining if task can be moved by AI
- `duration`: Integer minutes, must equal `(end_time - start_time)` - no validation enforced, calculated at creation
- `completed`: Excluded from AI optimization queries

### Notification System
Frontend implements browser notifications via Notification API:
- Checks every 60 seconds for tasks starting in 29-30 minutes
- Requires user permission grant (`Notification.permission === "granted"`)
- Respects `userSettings.notificationsEnabled` flag
- Email reminders are UI-only toggles - no actual email service implemented yet

## Common Development Tasks

### Adding New Task Fields
1. Add column to `models.Task` (SQLAlchemy model)
2. Update `schemas.TaskBase` and `schemas.TaskUpdate`
3. Mirror in `types.ts` (frontend)
4. Database will auto-migrate on next backend restart (dev only - production needs proper migrations)

### Modifying AI Algorithm
Edit `ai_service.py` → `calculate_schedule()` function. Key data structures:
- `fixed_blocks`: List of dicts with `{"start": int, "end": int, "type": str}` (minutes since midnight)
- `flexible_tasks`: SQLAlchemy query results, sorted by priority/duration
- `proposals`: Return format must match `schemas.TaskProposal`

### Testing API Changes
Use auto-generated Swagger UI at `http://127.0.0.1:8000/docs` - includes request examples and try-it-out functionality.

## Dependencies to Watch

### Backend Python Packages
- `mysql-connector-python`: MySQL driver (must match server version)
- `fastapi[standard]`: Includes Uvicorn and validation
- `python-jose`, `passlib`: Auth dependencies (not yet used but installed)

### Frontend NPM Packages  
- `date-fns`: All date manipulation - avoid native Date() methods
- `lucide-react`: Icon library - use existing icons before adding new ones
- `@tailwindcss/postcss`: Using Tailwind v4 (oxide engine) - syntax differs from v3

## Deployment Notes
- Backend requires MySQL server - SQLite not supported (hard MySQL dependency in `database.py`)
- Frontend build: `npm run build` → outputs to `frontend/dist/`
- No environment variable system yet - all config hardcoded
- Database credentials exposed in source - add `.env` before production deployment
