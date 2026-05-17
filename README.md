# vshslv-site

Site-wide and per-page custom code for vshslv.com, served via jsDelivr CDN.

## Structure

```
global/      → applied site-wide (Site Settings → Custom Code)
home/        → Home page only (Page Settings → Custom Code)
about/       → About page only
portfolio/   → Portfolio page only
```

`vshslv-stories` is a separate repo for the Stories feature (loaded only on Home).

## Webflow setup

### Site Settings → Custom Code

**Inside `<head>` tag:**
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/vshslv/vshslv-site@main/global/global.css">
```

**Footer Code:**
```html
<script src="https://cdn.jsdelivr.net/gh/vshslv/vshslv-site@main/global/global.js" defer></script>
```

### Home Page Settings → Custom Code

**Inside `<head>` tag:**
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/vshslv/vshslv-site@main/home/home.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/vshslv/vshslv-stories@main/stories.css">
```

**Before `</body>` tag:**
```html
<script src="https://cdn.jsdelivr.net/gh/vshslv/vshslv-site@main/home/home.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/vshslv/vshslv-stories@main/stories.js" defer></script>
```

### About Page Settings → Custom Code

**Inside `<head>` tag:**
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/vshslv/vshslv-site@main/about/about.css">
```

**Before `</body>` tag:**
```html
<script src="https://cdn.jsdelivr.net/gh/vshslv/vshslv-site@main/about/about.js" defer></script>
```

### Portfolio Page Settings → Custom Code

**Inside `<head>` tag:**
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/vshslv/vshslv-site@main/portfolio/portfolio.css">
```

**Before `</body>` tag:**
```html
<script src="https://cdn.jsdelivr.net/gh/vshslv/vshslv-site@main/portfolio/portfolio.js" defer></script>
```

## Pushing changes

```bash
./push.sh "describe what changed"
```

This commits everything, pushes to GitHub, purges jsDelivr cache for every CSS/JS file. Browser refresh will pick up the new version.

## Cache busting

`@main` tracks the tip of main branch and auto-updates within seconds after `push.sh`.

For deterministic versions use a commit hash: `@<7-char-sha>` instead of `@main`.

## Namespaces

Each JS file wraps its logic in an IIFE and exposes a single global object:

- `window.VshGlobal`
- `window.VshHome`
- `window.VshAbout`
- `window.VshPortfolio`

Stories lives at `window.VshStories` (separate repo).

This keeps everything collision-free.
