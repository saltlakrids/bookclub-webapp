# Getting the club onto the book club app

## Before you send the guide (Frederik)

1. **Put everyone's email on the list.** Cloudflare Zero Trust → Access controls → Applications → Bookclub → its policy → Include → Emails: add the address each member will log in with (their Google account if they use Google, otherwise any address they read). Only these addresses get past the login page.

2. **Google users:** the Google login runs as a test app, so also add their Google address in Google Cloud Console → project `karensmindevej-login` → Google Auth Platform → Audience → Test users. Anyone not added there can still log in with the emailed code.

3. **Make the login last a month:** Zero Trust → Access controls → Applications → Bookclub → Edit → Session duration 1 month.

4. **Check who has joined** once they have opened the app:

   ```bash
   ssh homepi "cd /opt/bookclub/server && sudo -u bookclub DB_PATH=/var/lib/bookclub/bookclub.db node cli.js members"
   ```

   If someone picked the wrong name, `cli.js unclaim <name>` frees it so they can pick again.

## The guide to send

> Hi guys! 📚🎩 The book club app has a new home with a few new things: you can follow each other's reading progress, and the app can sit on your home screen and send notifications. Setting it up takes 5 minutes.
>
> **1. Log in (once)**
> - Open https://bookclub.karensmindevej.app
> - Log in with Google, or type your email and enter the code you get by mail. Use the address you gave me, otherwise you're not let in.
> - The hat asks "Who are you?". Pick your own name and tap "That's me". You only do this once, so pick the right one 😉
>
> **2. Put it on your home screen**
>
> *iPhone*
> - Open the link in **Safari** (not Chrome or the Gmail/Messenger browser).
> - Tap the **Share** button (square with an arrow) → scroll down → **Add to Home Screen** → **Add**.
> - Open the book club from the new hat icon. It's its own app, so you log in once more there.
>
> *Android*
> - Open the link in **Chrome**.
> - Tap **⋮** (top right) → **Add to Home screen** → **Install** (or "Install app" if you see that).
> - Open the book club from the new hat icon.
>
> **3. Turn on notifications**
> - In the app from your home screen, tap **Progress** and scroll to **Notifications**.
> - Tick **Notifications on this device** and tap **Allow** when the phone asks.
> - Tap **Send a test**. A notification should show up within a few seconds.
> - Choose when you want the **weekly status** (day and hour, or Off). Default is Sunday 19:00.
> - Tick **When someone else updates their progress** if you want a ping every time one of us reads. It's off by default.
> - iPhone needs iOS 16.4 or newer, and it only works from the home screen app, not in Safari.
>
> **4. How it works**
> - **Add Book:** search for a book and put it in the hat.
> - **Pick Book:** tap the hat and let fate decide 🥁
> - **Progress:** after reading, tap +10 / +20 / +50 or type the page you're on. Everyone gets a health bar, so you can see who's lagging behind 👀 If your edition has a different number of pages (e.g. a Danish translation), tap "My edition has a different number of pages". Then the bars compare fairly in percent.
> - **Rate Book:** when you've finished, score it from 1 to 10. Nobody sees the scores until all four of us have rated. If you didn't read it, tap "Skip, I didn't read it" so the rest of us aren't stuck waiting.
> - **My Books:** your stats and favourites.
>
> You stay logged in for a month at a time. If the app shows a login page, just log in again.
