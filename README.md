# Dead Sea team day schedule (mirror)

Built output of the private `unit-trip-schedule` repo, published with `npm run publish:static`.
Do not edit here: every publish replaces this repo.

- `site/`: the participant page (no data in git).
- `.github/workflows/sync.yml`: every 5 minutes fetches the live schedule and deploys it to GitHub Pages as one
  encrypted file per person (`scripts/build-static-data.mjs`, `shared/sealed.ts`).
