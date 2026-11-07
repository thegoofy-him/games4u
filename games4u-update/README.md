# games4u

Free open-source games, playable instantly in any browser, on any device.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Home page: all games, with filters and search |
| `play.html` | Game page: the game player, description, facts and credits |
| `dev.html` | Developer page: add a game to the site |
| `games.js` | The list of games (the developer page edits it for you) |
| `games/` | One folder per game (the developer page fills it for you) |
| `assets/` | The site's styles and scripts |

## Add a game

1. Open `https://<your-username>.github.io/<repo>/dev.html`.
2. First time only: connect with your own GitHub access token (the page explains how).
3. Paste the game's GitHub link and click **Import from GitHub**,
   or choose the game's folder or .zip from your computer.
4. Fill in the game page, add a cover and screenshots, and click **Publish game**.
5. The game is live about a minute later.

Only add games whose license lets you host them (MIT, Apache, BSD, GPL…).

## Make someone a developer

1. In the repo, go to **Settings → Collaborators → Add people** and enter
   their GitHub username or email.
2. They accept the email invite.
3. They make their own access token and connect on `dev.html`.

To remove a developer, remove them from Collaborators. Their token stops working
for this repo.

## Games that need a build step

If a game's README says `npm install` / `npm run build`, build it on your
computer first, then choose the built folder (often `dist` or `build`) on the
developer page.
