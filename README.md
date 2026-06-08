# AI Gym Trainer

A dark, high-energy fitness web app concept. Upload an InBody body-composition report and get a personalized diet + 8-week workout plan. Built from a Stitch design system ("Kinetic Lab") with a small client-side **plan engine** that derives the diet and training from your InBody numbers.

🔗 **Live:** https://tah10mid.github.io/ai-gym/

## Screens
| File | Page |
|------|------|
| `index.html` | Tabbed preview of all screens |
| `1-landing.html` | Landing |
| `2-upload-review.html` | Upload & InBody review |
| `3-dashboard.html` | Results / body-composition dashboard |
| `4-diet.html` | Diet plan (InBody-driven) |
| `5-workout.html` | 8-week workout plan (InBody-driven) |

## How the plan is derived
`plan-engine.js` turns InBody values into a full plan:
- **BMR** — uses an InBody-printed BMR if provided, else Mifflin–St Jeor.
- **Goal** — chosen from PBF + SMM: `CUT` / `RECOMP` / `LEAN BULK` / `MAINTAIN`.
- **Calories** — TDEE adjusted by goal; **macros** — protein anchored to lean mass, fat as % of kcal, carbs fill the rest.
- **Workout** — focus, rep range, split, and cardio flow from the same goal.

Open the diet or workout page and use the **⚙ INBODY** panel (bottom-right) to enter your numbers; both pages recompute live (values persist via `localStorage`).

> Note: these are front-end prototypes layered on the design mockups. The formulas are sensible defaults, **not** medical prescriptions.

## Exercise GIFs
`5-workout.html` loads demo GIFs from **ExerciseDB** (RapidAPI). Paste your free key into the `RAPIDAPI_KEY` constant near the bottom of that file.

## Backend — real InBody OCR (`/api/analyze`)
A Vercel serverless function (`api/analyze.js`) reads an uploaded InBody report image with **Claude Opus 4.8 (vision)** and returns structured metrics, which `plan-engine.js` turns into the diet + workout.

- Set **`ANTHROPIC_API_KEY`** in Vercel → Project → Settings → Environment Variables.
- The **Upload & Review** page has an "Analyze InBody report (AI)" panel: pick a photo → it calls `/api/analyze` → the values persist (localStorage) and drive both plans.
- The `/api` endpoint only runs on Vercel (or locally via `vercel dev`) — the plain `python -m http.server` preview can't serve it.

## Deploy
Static site — GitHub Pages from `main` / root. Enable in **Settings → Pages → Source: main /(root)**.
