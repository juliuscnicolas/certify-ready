# Certify Ready

## Purpose
This project is a practice app I use before taking my certification exam.

It helps me review question sets, run through practice sessions, and check results so I can prepare with confidence.

## Project Structure
- `certify-ready-api`: ASP.NET Core API for serving questions and handling quiz flows.
- `certify-ready-ui`: Vite + React frontend for the practice experience.
- `dumps`: Source question material and JSON datasets.

## Run Locally
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

## Notes
- Keep question data files in the `dumps` folder.
- Use this app to practice repeatedly before your certification date.
