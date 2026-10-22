# Getting the club onto the book club app

## Before you send the guide (Frederik)

1. **Lock the share down to the book club.** Shared users can reach every port on homepi by default, so the energy hub, the meditation app and SSH would be open to them too. In the admin console go to Access controls and replace the open "everyone can reach everything" rule with these two:

   ```json
   "grants": [
     // You and your own devices, as before
     { "src": ["autogroup:member"], "dst": ["*"], "ip": ["*"] },
     // People homepi is shared with: the book club only
     { "src": ["autogroup:shared"], "dst": ["*"], "ip": ["tcp:10000"] }
   ]
   ```

   If your policy file uses the older `"acls"` format, the same idea is
   `{ "action": "accept", "src": ["autogroup:member"], "dst": ["*:*"] }` and
   `{ "action": "accept", "src": ["autogroup:shared"], "dst": ["*:10000"] }`.

2. **Make a share link.** Admin console → Machines → homepi → ⋯ → Share → Copy invite link. Turn on "Reusable link" so one link works for all three, and paste it into the guide below. Treat it like a password, and turn it off once everyone has joined. Unused links expire after 30 days.

3. **Check who has joined** once they have opened the app:

   ```bash
   ssh homepi "cd /opt/bookclub/server && sudo -u bookclub DB_PATH=/var/lib/bookclub/bookclub.db node cli.js members"
   ```

   If someone picked the wrong name, `cli.js unclaim <name>` frees it so they can pick again.

## The guide to send

> Hi guys! 📚🎩 The book club app has moved to my Raspberry Pi, and now everyone rates for themselves. It takes about 5 minutes to get in.
>
> **1. Get Tailscale** (it lets your phone talk to the Pi)
> - Install Tailscale from the App Store or Play Store. It works on your laptop too.
> - Open it and sign in. Signing in with Google or Apple is easiest.
> - Open this link and tap Accept: [SHARE LINK]
> - Leave Tailscale switched on. It's fine to keep it on all the time.
>
> **2. Open the book club**
> - Go to https://homepi.taila9758a.ts.net:10000
> - The hat asks "Who are you?". Pick your own name and tap "That's me". You only do this once, so pick the right one 😉
> - Tip: add the page to your home screen (Share → Add to Home Screen on iPhone, ⋮ → Add to Home screen on Android).
>
> **3. How it works now**
> - **Add Book:** search for a book and put it in the hat.
> - **Pick Book:** tap the hat and let fate decide 🥁
> - **Rate Book:** when you've finished the book, give it your score from 1 to 10. Nobody sees the scores until all four of us have rated, then they're revealed together. You can change your score until then. If you didn't read it, tap "Skip, I didn't read it" so the rest of us aren't stuck waiting.
> - All our old ratings since 2021 are in there too, including Eva's and Jens's.
>
> If the page won't load, open Tailscale and make sure it's switched on.
