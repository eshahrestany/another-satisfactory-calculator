# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A production-line optimizer for the game Satisfactory. Users configure target production rates, and the app uses a linear programming solver to compute the optimal factory layout. Results are displayed as an interactive node graph.

## Commands

### Backend (Rust/Axum)
```bash
cd backend
cargo build                          # build
cargo run                            # run server on :3000 (requires data.json in cwd)
cargo check                          # fast type-check without linking
cargo clippy                         # lint
cargo test                           # run tests

# CLI solver for debugging the LP engine (run from backend/)
cargo run --bin solve -- --item Desc_IronPlate_C:30
cargo run --bin solve -- --item Desc_Motor_C:10 --verbose
cargo run --bin solve -- --item Desc_IronPlate_C:30 --alternate Recipe_SolidSteelIngot_C
cargo run --bin solve -- --item Desc_Motor_C:5 --optimize power --miner-level 3
```

### Frontend (React/Vite)
```bash
cd frontend
npm install
npm run dev      # dev server with HMR (proxies /api to :3000)
npm run build    # tsc + vite build
npm run lint     # eslint
```

### Environment variables (backend)
- `DATA_PATH` — path to `data.json` (default: `data.json` in cwd)
- `DB_PATH` — path to SQLite file (default: `factories.db` in cwd)

## Architecture

### Backend (`backend/src/`)

**Data flow**: `data.json` (Satisfactory game data) → `models/game_data.rs` (`RawDataFile` → `GameData`) → loaded into `AppState` at startup alongside the SQLite connection.

**Solver** (`solver/engine.rs`): The core LP engine. Takes a `SolveRequest`, builds a linear program where variables represent per-minute recipe throughput, solves it with `good_lp`/`minilp`, then assembles the result into `SolveResponse` (nodes + edges + summary). The solver supports:
- Two modes: **production** (meet item targets) and **power** (meet MW target using virtual `__gen_*` generator recipes)
- Four optimization goals: minimize raw resources, minimize buildings, minimize power, minimize specific resources
- Somersloops (doubles recipe output, halves building count), clock speed, provided inputs, resource constraints, disabled recipes

**Routes** (`routes/`):
- `GET /api/items|recipes|buildings|generators` — game data
- `POST /api/solve` — runs the LP solver
- `GET|POST|PUT|DELETE /api/factories[/{id}]` — factory CRUD (scoped by `user_id` cookie)
- `POST /api/factories/{id}/share` + `GET /api/share/{token}` — share links

**User identity** (`middleware/user_id.rs`): Cookieless auth — a UUID is generated and set in a `user_id` cookie on first request. No login required.

**Database** (`db.rs`): SQLite with two tables: `factories` (stores factory config JSON) and `share_links` (maps tokens to factory IDs).

### Frontend (`frontend/src/`)

**State** (`stores/useFactoryStore.ts`): Single Zustand store holding all factory configuration (targets, recipes, settings, node overrides, etc.) plus the solver result. `solve()` serializes state into a `SolveRequest`, calls `POST /api/solve`, and stores the `SolveResponse`.

**Graph visualization** (`components/graph/`): ReactFlow renders the `SolveResponse` as an interactive DAG. Layout is computed by `utils/layoutGraph.ts` using `@dagrejs/dagre`. Node types: `recipe`, `resource`, `output`, `input`, `generator`.

**Panels** (`components/panels/`): Side-panel UI for configuring targets, inputs, recipes, optimization settings, power mode, resource constraints, and save/load.

**API client** (`api/`): Thin wrappers around `fetch` for each backend route group.

**Guest mode**: When a `?share=TOKEN` URL parameter is present, the app fetches the shared factory, loads it read-only into the store, and solves it automatically. `useSharePolling.ts` polls the backend to detect when the owner updates a shared factory.

### Key type contracts

The `SolveRequest` / `SolveResponse` types are defined in both places and must stay in sync:
- Backend: `backend/src/models/solver_io.rs`
- Frontend: `frontend/src/types/solver.ts`

The `FactoryConfig` persisted to SQLite is defined in:
- Backend: `backend/src/models/factory.rs`
- Frontend: `frontend/src/types/factory.ts`
