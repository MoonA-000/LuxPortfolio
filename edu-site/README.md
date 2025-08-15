# Learning Hub

A clean, legit study site with a Pomodoro timer and quick flashcards.

## Features
- Pomodoro timer with focus/break durations
- Lightweight flashcards (no login)
- Mobile-friendly, fast static site

## Local preview
Use any static server:

```bash
# Python
python3 -m http.server 8080 -d /workspace/edu-site
# or Node
npx serve /workspace/edu-site -l 8080
```

Open `http://localhost:8080`.

## Publish (GitHub Pages)
1. Create a repo and push this folder contents to the repo root.
2. In Settings → Pages, choose `Deploy from a branch`, branch `main`, folder `/ (root)`.
3. Your site will be at `https://<username>.github.io/<repo>`.

## Publish (Netlify)
1. Drag-and-drop the `edu-site` folder in Netlify Dashboard, or connect Git.
2. Build settings: none (static). Publish directory: `/`.

## Monetization (ethical)
- Apply to an ad network that allows student-friendly content (e.g., EthicalAds). Insert their script in the `<!-- AD SLOT -->` area of `index.html`.
- Add clear disclosures and links in `pages/privacy.html`.
- Respect school and local policies.

## Customization
- Replace `assets/icon.svg` with your logo (keep the filename).
- Update titles, description, and contact info in `pages/*`.

## License
MIT.