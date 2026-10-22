# Getting the club onto the book club app

## Before you send the guide (Frederik)

1. **Share the bookclub machine, not homepi.** The book club has its own Tailscale machine called "bookclub", which only serves the app. Admin console → Machines → bookclub → ⋯ → Share → Copy invite link. Turn on "Reusable link" so one link works for all three, and paste it into the guide below. Treat it like a password, and turn it off once everyone has joined. Unused links expire after 30 days.

   Sharing bookclub instead of homepi means the energy hub, the meditation app and SSH stay out of reach. If you added an `autogroup:shared` rule limited to port 10000 earlier, change it to `tcp:443` or remove it, otherwise it blocks the new address.

2. **Turn off key expiry for bookclub** (Machines → bookclub → ⋯ → Disable key expiry), so it does not log itself out after 180 days.

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
> - Go to https://bookclub.taila9758a.ts.net
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
