# Getting the club onto the book club app

## Before you send the guide (Frederik)

1. **Put everyone's email on the list.** Cloudflare Zero Trust → Access controls → Applications → Bookclub → its policy → Include → Emails: add the address each member will log in with (their Google account if they use Google, otherwise any address they read). Only these addresses get past the login page.

2. **Google users:** the Google login runs as a test app, so also add their Google address in Google Cloud Console → project `karensmindevej-login` → Google Auth Platform → Audience → Test users. Anyone not added there can still log in with the emailed code.

3. **Check who has joined** once they have opened the app:

   ```bash
   ssh homepi "cd /opt/bookclub/server && sudo -u bookclub DB_PATH=/var/lib/bookclub/bookclub.db node cli.js members"
   ```

   If someone picked the wrong name, `cli.js unclaim <name>` frees it so they can pick again.

## The guide to send

> Hi guys! 📚🎩 The book club app has a new home, and you no longer need Tailscale for it. It takes a minute:
>
> **1. Open the book club**
> - Go to https://bookclub.karensmindevej.app
> - Log in with Google, or type your email and enter the code you get by mail. Use the address you gave me.
> - The hat asks "Who are you?". Pick your own name and tap "That's me". You only do this once, so pick the right one 😉
> - Tip: add the page to your home screen (Share → Add to Home Screen on iPhone, ⋮ → Add to Home screen on Android).
>
> **2. How it works**
> - **Add Book:** search for a book and put it in the hat.
> - **Pick Book:** tap the hat and let fate decide 🥁
> - **Rate Book:** when you've finished the book, give it your score from 1 to 10. Nobody sees the scores until all four of us have rated, then they're revealed together. You can change your score until then. If you didn't read it, tap "Skip, I didn't read it" so the rest of us aren't stuck waiting.
> - All our old ratings since 2021 are in there too, including Eva's and Jens's.
>
> You stay logged in for a month at a time. You can uninstall Tailscale if you only had it for the book club.
