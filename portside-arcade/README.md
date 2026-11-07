# Portside Arcade

A website for open-source browser games. Players open the site in any browser
(Chrome, Safari, Firefox, Edge, phones too), pick a game, and play it right on
the game's page.

## What's in this folder

| File | What it does |
| --- | --- |
| `index.html` | Home page: all games, with filters for players and difficulty, and search |
| `play.html` | Game page: the game player, description, how to play, facts and credits |
| `dev.html` | Developer tool: fill in a form to create a game's entry |
| `games.js` | The list of games on the site |
| `games/` | One folder per game, holding the game's files and its images |
| `assets/` | The site's styles and scripts |

## Put the site online with GitHub Pages (free)

1. Sign in to github.com and create a new repository, for example `portside-arcade`.
   Make it **Public** (free GitHub Pages needs a public repo).
2. Upload everything in this folder to the repo: on the repo page click
   **Add file → Upload files**, drag in the contents of this folder, and commit.
3. Go to **Settings → Pages**. Under "Build and deployment", set Source to
   **Deploy from a branch**, Branch to **main** and folder to **/ (root)**. Save.
4. Wait about a minute. Your site is at:
   `https://<your-username>.github.io/portside-arcade/`

That link opens in any browser, for anyone, with no account needed.

## Who can add games

Only people with write access to the GitHub repo can change the site, so only
your team can port games. Add teammates in the repo's
**Settings → Collaborators**.

## Port a game

1. Find an HTML5 game on GitHub with an open license (MIT, Apache, BSD, GPL…).
   Read its `LICENSE` file. No license means you can't host it.
2. Download the game: on its repo page click **Code → Download ZIP**, then unzip it.
3. Make a folder `games/<id>/` (for example `games/clumsy-bird/`) and copy the
   game's files into it. The folder must contain the page that starts the game,
   usually `index.html`.
4. Add a cover image and a few screenshots to the same folder.
5. Open `dev.html`, fill in the form, click **Copy entry**, and paste it inside
   the `[ ]` in `games.js`.
6. Test it (see below), then commit and push. The site updates in about a minute.

Some games need a build step before they run (their README will say
`npm install` / `npm run build`). For those, copy the built output folder
(often `dist/` or `build/`) instead of the source.

## Test on your computer before pushing

Games load inside the page, which browsers block when you double-click an
HTML file. Run a small local server from this folder instead:

```
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser.

## Credits

Every game page shows the original author, license and source link. Keep the
game's own `LICENSE` file inside its folder.
