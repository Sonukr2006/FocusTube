# FocusTube

FocusTube is a full-stack project with:
- `client` -> React + Vite frontend
- `server` -> Node.js + Express backend

## Prerequisites

- Node.js (LTS recommended)
- npm
- Git

## Clone and Setup

```bash
git clone <your-repo-url>
cd FocusTube
```

Install dependencies for both apps:

```bash
cd server
npm install

cd ../client
npm install
```

## Run the Project

Run backend (Terminal 1):

```bash
cd server
npm start
```

Backend runs on: `http://localhost:3000`

Run frontend (Terminal 2):

```bash
cd client
npm run dev
```

Frontend usually runs on: `http://localhost:5173`

## Optional Environment Variable (Frontend)

If backend URL changes, create `client/.env` and set:

```env
VITE_API_BASE_URL=http://localhost:3000
```

If not set, frontend already uses `http://localhost:3000` by default.
