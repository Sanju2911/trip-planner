# Publish as trip-planner on GitHub

## Suggested repository details

- **Name:** `trip-planner`
- **Description:** A React trip planner with a calendar dashboard, group coordination, itineraries, expenses, transport bookings, and packing lists.
- **Topics:** `react`, `vite`, `supabase`, `trip-planner`, `travel`, `javascript`

## Before uploading

- Review [SECURITY.md](SECURITY.md). This is a portfolio/demo until authentication and authorization are redesigned.
- Choose a license if you want others to reuse the code; add a corresponding `LICENSE` file. The repository currently has none.
- Confirm only placeholder credentials and fictional screenshots will be published.
- Run `npm ci`, `npm run lint`, and `npm run build`.
- Include `README.md`, `docs/`, `database/`, `scripts/`, source files, `.env.example`, and `package-lock.json`.
- Exclude `.env`, `.firebaserc`, `.firebase/`, `node_modules/`, `dist/`, and `out.html`. The supplied `.gitignore` covers these.

The project is prepared for publication at https://github.com/Sanju2911/trip-planner. The commands below also describe how to publish a separate copy under your own account.

## Upload using Git

Create an empty GitHub repository named `trip-planner`. Avoid generating an extra README or license on GitHub for a fresh upload, since the local folder already contains a README.

From this folder:

```bash
git init
git branch -M main
git add .
git status --short
git diff --cached --stat
```

Inspect staged files before committing. Verify exclusions:

```bash
git check-ignore .env .firebaserc .firebase/ node_modules/ dist/ out.html
git ls-files .env .firebaserc out.html
```

The second command should print nothing. If sensitive files are already tracked, remove them from the Git index while preserving local files and review earlier history for cleanup.

Once staged content is correct:

```bash
git commit -m "Prepare trip planner with documentation and screenshots"
git remote add origin https://github.com/YOUR_USERNAME/trip-planner.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your username. If a Git repository or remote already exists, inspect that configuration rather than repeating initialization or adding a duplicate remote.

## After uploading

Verify README screenshots render on the repository homepage. Set the description and topics above. Link a live demo only after addressing backend security; static hosting configuration alone does not make the custom login secure.

