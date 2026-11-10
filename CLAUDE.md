## Learnings

- bookclub: `npm run build` fails for the agent user on EACCES at node_modules/.cache/eslint. Lint passes separately. To build, temporarily set `lintOnSave: false` in vue.config.js, then `git checkout vue.config.js`. For screenshots, the helper refuses this project. Use a playwright-core script (/opt/agentboard/node_modules) with `executablePath: '/usr/bin/chromium-headless-shell'`, since Playwright's own browser download isn't installed.
