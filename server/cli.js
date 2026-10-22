// Admin helpers, run on the Pi as the service user, e.g.
//   sudo -u bookclub DB_PATH=/var/lib/bookclub/bookclub.db node cli.js members
//   ... node cli.js unclaim Oscar
//   ... node cli.js claim Oscar oscar@example.com

import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { openDb } from "./db.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const db = openDb(process.env.DB_PATH || join(here, "..", "data", "bookclub.db"));
const [command, name, login] = process.argv.slice(2);

function done(changes, what) {
  if (changes === 0) {
    console.error(`No active member called "${name}".`);
    process.exit(1);
  }
  console.log(what);
}

switch (command) {
  case "members":
    console.table(db.prepare("SELECT name, active, tailscale_login FROM members ORDER BY active DESC, name").all());
    break;

  case "unclaim":
    done(db.prepare("UPDATE members SET tailscale_login = NULL WHERE name = ? AND active = 1").run(name).changes,
      `${name} can be claimed again.`);
    break;

  case "claim":
    if (!login) {
      console.error("Usage: node cli.js claim <member> <tailscale login>");
      process.exit(1);
    }
    done(db.prepare("UPDATE members SET tailscale_login = ? WHERE name = ? AND active = 1").run(login, name).changes,
      `${name} is now ${login}.`);
    break;

  default:
    console.log("Commands: members | unclaim <member> | claim <member> <tailscale login>");
}
