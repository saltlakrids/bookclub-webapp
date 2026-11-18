## Learnings

- Build: `npm run build` fails for the agent user with EACCES at node_modules/.cache/eslint, but lint passes on its own. To build, temporarily add `lintOnSave: false` to vue.config.js, then run `git checkout vue.config.js`.
- Screenshots: the shots helper refuses this project because it has no preview recipe. Use a playwright-core script from the agentboard checkout's node_modules (Pi `/opt/agentboard`, PC `~/src/agentboard`). On the Pi, pass `executablePath: '/usr/bin/chromium-headless-shell'`. On the PC, use Playwright's headless shell in `~/.cache/ms-playwright`. Don't install a browser.
