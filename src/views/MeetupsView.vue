<template>
  <div class="meetups-page">
    <h2 class="heading">Meetups</h2>
    <p v-if="loading" class="note">Loading...</p>
    <p v-else-if="loadError" class="note error">{{ loadError }}</p>

    <template v-else>
      <section v-if="next" class="panel next">
        <p class="label">Next up</p>
        <div class="next-head">
          <div class="date-block" :aria-label="longDate(next.startsAt)">
            <span class="weekday">{{ part(next.startsAt, { weekday: "short" }) }}</span>
            <span class="day">{{ part(next.startsAt, { day: "numeric" }) }}</span>
            <span class="month">{{ part(next.startsAt, { month: "short" }) }}</span>
          </div>
          <div class="next-info">
            <span class="badge" :class="next.kind">{{ kindLabel(next) }}</span>
            <p class="time">{{ time(next.startsAt) }}</p>
            <p class="countdown">{{ countdown(next.startsAt) }}</p>
          </div>
        </div>

        <div v-if="next.book" class="book-head">
          <BookCover :book="next.book" size="small" />
          <div>
            <h3>{{ next.book.title }}</h3>
            <p v-if="next.readToPage" class="read-to">Read up to p. {{ next.readToPage }}</p>
          </div>
        </div>
        <p v-if="next.description" class="description">{{ next.description }}</p>

        <template v-if="next.readToPage">
          <p v-if="next.mine" class="standing">
            <template v-if="next.mine.done">You've read up to p. {{ next.mine.target }}. 🎉</template>
            <template v-else>You're on p. {{ next.mine.page }}, {{ next.mine.toGo }} {{ next.mine.toGo === 1 ? "page" : "pages" }} to go.</template>
          </p>
          <div v-for="m in next.members" :key="m.name" class="reader" :class="{ me: m.name === me }">
            <div class="reader-line">
              <span class="reader-name">{{ m.name }}</span>
              <span>p. {{ m.page }} / {{ m.target }}<strong v-if="m.done"> ✓</strong></span>
            </div>
            <div class="health"><span :class="barClass(m)" :style="{ width: `${fill(m)}%` }" /></div>
          </div>
        </template>

        <div class="actions">
          <button type="button" class="action" :aria-expanded="calendarOpen" @click="calendarOpen = !calendarOpen">Add to calendar</button>
          <button type="button" class="action ghost" @click="edit(next)">Edit</button>
        </div>
        <div v-if="calendarOpen" class="calendar-options">
          <a :href="next.calendar.google" target="_blank" rel="noopener">Google Calendar</a>
          <a :href="next.calendar.outlook" target="_blank" rel="noopener">Outlook.com</a>
          <a :href="next.calendar.office365" target="_blank" rel="noopener">Microsoft 365</a>
          <a :href="`/api/meetups/${next.id}.ics`" download>Apple / other (.ics)</a>
        </div>
      </section>
      <p v-else class="note">No meetup planned yet.</p>

      <button type="button" class="plan" @click="plan">+ Plan a meetup</button>

      <section v-if="later.length" class="panel">
        <h3>Coming up</h3>
        <button v-for="m in later" :key="m.id" type="button" class="row" @click="edit(m)">
          <span class="row-date">{{ shortDate(m.startsAt) }}</span>
          <span class="row-text">{{ summary(m) }}</span>
        </button>
      </section>

      <details v-if="data.past.length" class="panel past">
        <summary>Past ({{ data.past.length }})</summary>
        <button v-for="m in data.past" :key="m.id" type="button" class="row" @click="edit(m)">
          <span class="row-date">{{ shortDate(m.startsAt, true) }}</span>
          <span class="row-text">{{ summary(m) }}</span>
        </button>
      </details>
    </template>

    <MeetupEditor :open="editorOpen" :meetup="editing" :books="books" @close="closeEditor" @saved="saved" @deleted="saved" />
  </div>
</template>

<script>
import api, { session, errorMessage } from "@/api";
import BookCover from "@/components/BookCover.vue";
import MeetupEditor from "@/components/MeetupEditor.vue";

const TIME_ZONE = "Europe/Copenhagen";

export default {
  components: { BookCover, MeetupEditor },
  data() {
    return { data: { upcoming: [], past: [] }, books: [], loading: true, loadError: "", calendarOpen: false, pushed: false };
  },
  computed: {
    me() {
      return session.member.name;
    },
    next() {
      return this.data.upcoming[0] || null;
    },
    later() {
      return this.data.upcoming.slice(1);
    },
    // The editor is a history entry: the route query says whether it is open
    editing() {
      const id = Number(this.$route.query.edit);
      return [...this.data.upcoming, ...this.data.past].find((m) => m.id === id) || null;
    },
    editorOpen() {
      return !this.loading && (this.$route.query.plan === "1" || this.editing !== null);
    },
  },
  async created() {
    try {
      const [meetups, books] = await Promise.all([api.get("/meetups"), api.get("/books")]);
      this.data = meetups.data;
      this.books = books.data.reading;
    } catch (error) {
      this.loadError = errorMessage(error);
    } finally {
      this.loading = false;
    }
  },
  methods: {
    plan() {
      this.pushed = true;
      this.$router.push({ query: { plan: "1" } });
    },
    edit(meetup) {
      this.pushed = true;
      this.$router.push({ query: { edit: String(meetup.id) } });
    },
    closeEditor() {
      // Back closes the popup (and so does Android's back gesture); a page opened straight on it drops the query instead
      if (this.pushed) {
        this.pushed = false;
        this.$router.back();
      } else {
        this.$router.replace({ query: {} });
      }
    },
    async saved() {
      this.closeEditor();
      try {
        this.data = (await api.get("/meetups")).data;
      } catch (error) {
        this.loadError = errorMessage(error);
      }
    },
    part(iso, options) {
      return new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, ...options }).format(new Date(iso));
    },
    time(iso) {
      return this.part(iso, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    },
    longDate(iso) {
      return this.part(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    },
    shortDate(iso, year = false) {
      return `${this.part(iso, { weekday: "short", day: "numeric", month: "short" })}${year ? ` ${this.part(iso, { year: "numeric" })}` : ""}`;
    },
    kindLabel(m) {
      return m.kind === "party" ? "🎉 Party" : "📚 Meetup";
    },
    summary(m) {
      const what = m.description || (m.book ? m.book.title : this.kindLabel(m));
      return `${this.time(m.startsAt)} · ${what}`;
    },
    // Calendar days between now and the meetup, in Danish time
    countdown(iso) {
      const day = (d) => this.part(d, { year: "numeric", month: "2-digit", day: "2-digit" }).split("/").reverse().join("-");
      const days = Math.round((Date.parse(day(iso)) - Date.parse(day(new Date()))) / 86400000);
      if (days <= 0) return Date.now() >= new Date(iso).getTime() ? "happening now" : "today";
      if (days === 1) return "tomorrow";
      return `in ${days} days`;
    },
    fill(m) {
      return m.target ? Math.min(100, Math.round((m.page / m.target) * 100)) : 0;
    },
    barClass(m) {
      const p = this.fill(m);
      return p < 34 ? "low" : p < 67 ? "mid" : "high";
    },
  },
};
</script>

<style scoped>
.meetups-page {
  position: relative;
  z-index: 99;
  max-width: 640px;
  margin: 0 auto;
  padding: 0 16px 48px;
}

.note {
  opacity: 0.85;
}

.error {
  color: #ff7b7b;
}

.panel {
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 14px;
  background: rgba(20, 16, 30, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-align: left;
}

.panel h3 {
  margin: 0 0 8px;
  color: #ffc90e;
}

.label {
  margin: 0 0 8px;
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  opacity: 0.7;
}

.next-head {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 14px;
}

.date-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 84px;
  padding-bottom: 6px;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  color: #1d1729;
  text-align: center;
  line-height: 1.1;
}

.date-block .weekday {
  align-self: stretch;
  padding: 4px 0;
  background: #d64545;
  color: #fff;
  font-size: 13px;
  font-weight: bold;
  text-transform: uppercase;
}

.date-block .day {
  font-size: 38px;
  font-weight: bold;
}

.date-block .month {
  font-size: 14px;
  text-transform: uppercase;
}

.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: bold;
  background: rgba(255, 201, 14, 0.2);
  color: #ffc90e;
}

.badge.party {
  background: rgba(255, 123, 200, 0.2);
  color: #ff9ad5;
}

.time {
  margin: 6px 0 0;
  font-size: 26px;
  font-weight: bold;
}

.countdown {
  margin: 0;
  opacity: 0.8;
}

.book-head {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
}

.book-head h3 {
  margin: 0;
}

.read-to {
  margin: 0;
  font-weight: bold;
}

.description {
  margin: 0 0 10px;
  white-space: pre-wrap;
}

.standing {
  margin: 10px 0 6px;
  font-weight: bold;
}

.reader {
  padding: 4px 0;
}

.reader.me .reader-name {
  color: #ffc90e;
}

.reader-line {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.reader-name {
  font-weight: bold;
}

.health {
  height: 12px;
  margin-top: 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.25);
  overflow: hidden;
}

.health span {
  display: block;
  height: 100%;
}

.health .low {
  background: linear-gradient(#ff8a6b, #e0452b);
}

.health .mid {
  background: linear-gradient(#ffe066, #ffc90e);
}

.health .high {
  background: linear-gradient(#7ee07e, #2fae4a);
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

button.action,
button.plan {
  flex: 1;
  width: auto;
  height: 44px;
  margin: 0;
  font-family: "Quicksand", sans-serif;
  font-size: 15px;
  font-weight: bold;
  border-radius: 10px;
  cursor: pointer;
  color: #1d1729;
  background: #ffc90e;
  border: none;
}

button.action.ghost {
  flex: 0 0 90px;
  color: #fff;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.35);
}

button.plan {
  display: block;
  width: 100%;
  margin-bottom: 16px;
}

.calendar-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}

.calendar-options a {
  display: block;
  padding: 11px 14px;
  border-radius: 10px;
  color: #fff;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

button.row {
  display: flex;
  gap: 12px;
  align-items: baseline;
  width: 100%;
  height: auto;
  margin: 0;
  padding: 10px 0;
  font-family: "Quicksand", sans-serif;
  font-size: 15px;
  text-align: left;
  color: #fff;
  background: none;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
}

.row-date {
  flex: 0 0 96px;
  font-weight: bold;
}

.row-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.past summary {
  cursor: pointer;
  font-weight: bold;
  color: #ffc90e;
}

.past .row:first-of-type {
  margin-top: 8px;
}
</style>
