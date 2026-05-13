# Certify Ready

Practice app for running certification exam sessions, reviewing answers, browsing dumps, and tracking previous attempts.

## Problem this app solves

Certification exams can feel unfamiliar even when you already know the technical material. A common problem is not just knowledge gaps, but lack of familiarity with the exam format, pacing, and the pressure of answering questions in a test-like flow.

Certify Ready solves that problem by serving as a mock exam tool. It helps you practice with question sets, review your answers, understand why answers are correct or incorrect, and evaluate your own readiness before taking the actual certification exam.

## What this project does

- Loads exam questions by exam type and dump source
- Creates exam sessions with:
	- question count
	- question type filter
	- question ID range
	- random or ordered mode
- Supports multiple question formats:
	- choice
	- sequence
	- hotspot
- Validates answers and shows score, incorrect answers, and explanations
- Saves exam attempts to result history
- Includes a Question Viewer page to browse questions with filters

## Project structure

- certify-ready-api: ASP.NET Core Web API
- certify-ready-ui: React + Vite frontend
- dumps: raw source material and JSON question dumps
- result: persisted exam result history

## Pages and flows

- Setup
	- Select exam type and dump source
	- Configure session settings
	- Navigate to Result History or Question Viewer
- Answering
	- Complete selected questions
- Review
	- Inspect answers before submit
- Results
	- See score breakdown and missed questions
	- Open result history
- Result History
	- Displays past attempts from result/result.json via API
- Question Viewer
	- Shows question, correct answer, and explanation
	- Filter by text, question IDs, question type, answer mode, and ID range

## Question Viewer filters

- Search: matches question text, explanation, option text, and answer keys
- Question IDs: comma-separated exact IDs (example: 11, 2, 3)
- Question type: all, choice, sequence, hotspot
- Answer mode: all, single-answer, multi-answer
- Question ID from/to: numeric range

## Prerequisites

- .NET 9 SDK
- Node.js 18+
- npm 9+

## Run locally

### 1. Start the API

```powershell
cd certify-ready-api
dotnet restore
dotnet run
```

### 2. Start the UI

```powershell
cd certify-ready-ui
npm install
npm run dev
```

### 3. Configure API base URL if needed

Create certify-ready-ui/.env if the API is not served from the same origin:

```env
VITE_API_BASE_URL=http://localhost:5203
```

## Scripts

### UI

- npm run dev: start Vite dev server
- npm run build: create production build
- npm run preview: preview production build
- npm run lint: run ESLint

## Data and persistence

- Questions are served by the API from dumps/json/*.json
- Result history entries are persisted by the API to result/result.json

## Frontend details

The frontend is a React single-page application built with Vite.

- Framework: React 18
- Build tool: Vite
- Styling: plain CSS via shared stylesheet files
- Data access: fetch-based API calls in certify-ready-ui/src/api.js
- UI model: phase-driven single-page flow managed in certify-ready-ui/src/App.jsx

### Frontend architecture used

- App shell
	- App.jsx is the main orchestration component
	- it loads exams, questions, result history, and manages the current UI phase
- Component-based UI
	- reusable panels and cards are split into focused components under certify-ready-ui/src/components
- Client-side filtering
	- setup filters and question viewer filters are applied in the UI with useMemo-based derived state
- Local state management
	- React useState and useEffect are used instead of a global state library
- API integration layer
	- certify-ready-ui/src/api.js centralizes HTTP calls for exams, questions, validation, and result history

### Main frontend phases

- setup
	- configure exam type, source, count, range, order, and question type
- answering
	- answer selected questions
- review
	- inspect selections before submitting
- results
	- view score breakdown, incorrect items, and explanations
- history
	- browse saved exam attempts
- viewer
	- browse questions with answers and explanations using filters

### Core frontend components

- App.jsx
	- owns top-level state and flow control
- QuestionCard.jsx
	- renders interactive questions during an exam session
- ReviewPanel.jsx
	- summarizes answers before submission
- ResultsPanel.jsx
	- displays score summary and incorrect answers
- QuestionViewerPanel.jsx
	- renders a read-only question browser with filters

### Frontend state and behavior

- Exam selection state
	- selected exam type and dump source
- Session configuration state
	- question count, question type, question ID range, and order mode
- Exam runtime state
	- selected questions, answers, exam start time, and current phase
- Results state
	- score summary, incorrect items, duration, and completion time
- History state
	- saved exam attempts loaded from the backend

### Frontend API usage

- fetchExams
	- loads available exam types and sources
- fetchAllQuestionsByExam
	- loads the active question bank for the selected exam/source
- validateQuestion
	- validates submitted answers for each question during exam submission
- fetchResultHistory
	- loads saved exam attempt history
- appendResultHistory
	- saves a completed exam attempt to the backend

### Frontend styling approach

- Shared visual styles live in certify-ready-ui/src/App.css and certify-ready-ui/src/index.css
- Panels, cards, tables, filters, and actions use a consistent design language
- Layout is responsive with CSS grid and breakpoint-based adjustments
- No external component library is used at the moment

## Backend architecture used

The backend is an ASP.NET Core Web API in the certify-ready-api project.

- Architecture style: lightweight layered API
- Entry point: Program.cs configures controllers, CORS, OpenAPI, and dependency injection
- API layer: controller-based endpoints for questions, answer validation, exam metadata, and result history
- Data access layer: repository pattern via IQuestionRepository
- Repository implementation: JsonQuestionRepository
- Storage model:
	- question banks are loaded from JSON files in dumps/json
	- result history is saved to result/result.json

### Backend request flow

- The UI calls the ASP.NET Core API
- QuestionsController reads exam/source data from IQuestionRepository
- JsonQuestionRepository resolves configured JSON file paths, loads question data, and keeps it in memory for reads
- Validation requests compare submitted answers with the stored correct answers
- ResultHistoryController reads and appends exam attempts to result/result.json

### Key backend patterns

- Dependency Injection
	- IQuestionRepository is registered as a singleton
- Repository Pattern
	- question retrieval is abstracted behind an interface
- Configuration-driven data sources
	- exam types and dump sources are mapped from configuration to JSON files
- File-based persistence
	- no database is used at the moment
- In-memory read model
	- question dumps are deserialized and served from memory after load

### Current backend responsibilities

- List available exams and sources
- Return paged questions by exam type and source
- Return a question by ID
- Validate submitted answers
- Save and return result history

This keeps the backend simple and easy to maintain while the question ingestion process is still manual.

## Current question dump workflow

As of now, question dumps are created manually.

- Source gathering is manual from internet materials.
- Question content is manually reviewed and curated.
- Conversion to JSON is done manually with help from GitHub Copilot.
- Final dump files are saved under dumps/json and then consumed by the API.

This is a temporary workflow and not yet an automated ingestion pipeline.

## Troubleshooting

- If the UI cannot load exams/questions:
	- verify the API is running
	- verify VITE_API_BASE_URL points to the API origin
	- check browser console/network for failing endpoints
- If result history does not update:
	- confirm API endpoint api/results/history is reachable
	- confirm the repository has a writable result/result.json path
