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
    console.table(db.prepare("SELECT name, active, login FROM members ORDER BY active DESC, name").all());
    break;

  case "unclaim":
    done(db.prepare("UPDATE members SET login = NULL WHERE name = ? AND active = 1").run(name).changes,
      `${name} can be claimed again.`);
    break;

  case "claim":
    if (!login) {
      console.error("Usage: node cli.js claim <member> <email>");
      process.exit(1);
    }
    // Cloudflare emails are compared lower-cased
    done(db.prepare("UPDATE members SET login = ? WHERE name = ? AND active = 1").run(login.toLowerCase(), name).changes,
      `${name} is now ${login.toLowerCase()}.`);
    break;

  default:
    console.log("Commands: members | unclaim <member> | claim <member> <email>");
}
