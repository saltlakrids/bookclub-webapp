<template>
  <div class="my-books">
    <h2 class="heading">{{ me }}'s books</h2>
    <p v-if="loading" class="note">Loading...</p>
    <p v-else-if="error" class="note error">{{ error }}</p>
    <p v-else-if="!stats.rated" class="note">Once you have rated a finished book, your stats show up here.</p>

    <template v-else>
      <div class="tiles">
        <div class="tile"><strong>{{ stats.rated }}</strong><span>books rated</span></div>
        <div class="tile"><strong>{{ stats.pages.toLocaleString("en-GB") }}</strong><span>pages read</span></div>
        <div class="tile"><strong>{{ stats.averageGiven.toFixed(1) }}</strong><span>your average score</span></div>
        <div v-if="stats.comparedToClub !== null" class="tile">
          <template v-if="Math.abs(stats.comparedToClub) < 0.1">
            <strong>≈</strong>
            <span>you score about like the club</span>
          </template>
          <template v-else>
            <strong>{{ signed(stats.comparedToClub) }}</strong>
            <span>{{ stats.comparedToClub > 0 ? "more generous" : "stricter" }} than the club</span>
          </template>
        </div>
      </div>

      <section class="panel">
        <div class="panel-head">
          <h3>{{ showAll ? "All books" : "Your favourites" }}</h3>
          <button type="button" class="share" @click="shareTop">{{ shareLabel }}</button>
        </div>
        <ol class="ranking">
          <li v-for="(entry, index) in topList" :key="entry.book.id" class="ranking-item" :class="{ open: openId === entry.book.id }">
            <div
              class="ranking-row"
              role="button"
              tabindex="0"
              :aria-expanded="openId === entry.book.id ? 'true' : 'false'"
              @click="toggleOpen(entry.book.id)"
              @keydown.enter.prevent="toggleOpen(entry.book.id)"
              @keydown.space.prevent="toggleOpen(entry.book.id)"
            >
              <span class="rank">{{ entry.score === null ? "" : index + 1 }}</span>
              <BookCover :book="entry.book" size="small" />
              <div class="ranking-text">
                <div class="ranking-title">{{ entry.book.title }}</div>
                <div class="ranking-meta">
                  Club {{ entry.book.average === null ? "–" : entry.book.average.toFixed(1) }}
                  <template v-if="entry.book.suggester"> · suggested by {{ entry.book.suggester }}</template>
                </div>
              </div>
              <span v-if="entry.score === null" class="ranking-unread">{{ entry.skipped ? "skipped" : "not read" }}</span>
              <span v-else class="ranking-score">{{ entry.score }}</span>
            </div>
            <div v-if="openId === entry.book.id" class="others">
              <div v-for="rating in othersOf(entry.book)" :key="rating.member" class="other-row">
                <span>{{ rating.member }}</span>
                <span>{{ rating.score }}</span>
              </div>
              <p v-if="!othersOf(entry.book).length" class="note small">Nobody else scored this book.</p>
            </div>
          </li>
        </ol>
        <button v-if="fullList.length > 5" type="button" class="more" @click="toggleShowAll">
          {{ showAll ? "Show only favourites" : `Show all ${fullList.length}` }}
        </button>
      </section>

      <section v-if="stats.suggested" class="panel">
        <h3>Your suggestions</h3>
        <p>
          The club has finished <strong>{{ stats.suggested }}</strong> of the books you put in the hat<template
            v-if="stats.suggestedAverage !== null">, scoring them <strong>{{ stats.suggestedAverage.toFixed(1) }}</strong> on average</template>.
        </p>
        <p v-if="stats.bestSuggested">
          Your best pick: <strong>{{ stats.bestSuggested.title }}</strong> ({{ stats.bestSuggested.average.toFixed(1) }})
        </p>
      </section>

      <section class="panel">
        <h3>The club's scoring</h3>
        <div v-for="member in clubMembers" :key="member.name" class="member-row" :class="{ me: member.name === me }">
          <span>{{ member.name }}</span>
          <span class="member-bar"><span :style="{ width: `${member.average * 10}%` }" /></span>
          <span class="member-average">{{ member.average.toFixed(1) }}</span>
        </div>
        <p class="note small">Average score each person gives, over the books they rated.</p>
      </section>
    </template>

    <BookDialog :open="manualShare !== ''" title="Your top 5" @close="manualShare = ''">
      <p class="note small">Copy the list and paste it wherever you like.</p>
      <textarea ref="shareText" class="share-text" readonly :value="manualShare" @focus="$event.target.select()" />
    </BookDialog>
  </div>
</template>

<script>
import api, { session, errorMessage } from "@/api";
import BookCover from "@/components/BookCover.vue";
import BookDialog from "@/components/BookDialog.vue";
import { memberStats, myBookList, ratersOf } from "@/stats";

export default {
  components: { BookCover, BookDialog },
  data() {
    return { rated: [], members: [], loading: true, error: "", showAll: false, openId: null, shareLabel: "Share top 5", manualShare: "" };
  },
  computed: {
    me() {
      return session.member.name;
    },
    stats() {
      return memberStats(this.rated, this.me);
    },
    fullList() {
      return myBookList(this.rated, this.me);
    },
    topList() {
      return this.showAll ? this.fullList : this.stats.top.slice(0, 5);
    },
    // Active members only: former members stay in the data but not in this list
    clubMembers() {
      return this.members
        .map((name) => ({ name, average: memberStats(this.rated, name).averageGiven }))
        .filter((m) => m.average !== null)
        .sort((a, b) => b.average - a.average);
    },
  },
  async created() {
    try {
      const { data } = await api.get("/books");
      this.rated = data.rated;
      this.members = data.members;
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.loading = false;
    }
  },
  methods: {
    toggleOpen(id) {
      this.openId = this.openId === id ? null : id;
    },
    toggleShowAll() {
      this.showAll = !this.showAll;
      if (!this.topList.some((entry) => entry.book.id === this.openId)) this.openId = null;
    },
    // Everyone who scored the book, except you (your score is on the row)
    othersOf(book) {
      return ratersOf(book)
        .filter((r) => r.member !== this.me)
        .sort((a, b) => b.score - a.score);
    },
    signed(n) {
      return `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}`;
    },
    // The phone's own share sheet when there is one, then the clipboard, then a box to copy from by hand
    async shareTop() {
      const lines = this.stats.top.slice(0, 5).map((e, i) => `${i + 1}. ${e.book.title} (${e.score}/10)`);
      const text = `My favourite books from the Slow Guys Book Club:\n${lines.join("\n")}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: "My favourite books", text });
          return;
        } catch (error) {
          if (error.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(text);
        this.flash("Copied!");
      } catch {
        this.manualShare = text;
        await this.$nextTick();
        this.$refs.shareText?.focus();
      }
    },
    flash(label) {
      this.shareLabel = label;
      setTimeout(() => (this.shareLabel = "Share top 5"), 2000);
    },
  },
};
</script>

<style scoped>
.my-books {
  position: relative;
  z-index: 99;
  max-width: 640px;
  margin: 0 auto;
  padding: 0 16px 48px;
}

.heading {
  animation: headingAnimation 1s ease-in-out forwards;
}

@keyframes headingAnimation {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.note {
  opacity: 0.85;
}

.note.small {
  font-size: 12px;
  margin-bottom: 0;
}

.error {
  color: #ff7b7b;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 10px;
  border-radius: 12px;
  background: rgba(20, 16, 30, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.tile strong {
  font-size: 26px;
  color: #ffc90e;
}

.tile span {
  font-size: 13px;
  opacity: 0.85;
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
  margin: 0 0 10px;
  color: #ffc90e;
}

.panel p {
  margin: 6px 0;
  font-size: 15px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}

.panel-head h3 {
  margin: 0;
}

.share,
.more {
  width: auto;
  height: 36px;
  margin: 0;
  padding: 0 14px;
  font-size: 14px;
  font-weight: bold;
  color: #1d1729;
  background: #ffc90e;
  border: none;
  border-radius: 999px;
}

.more {
  display: block;
  margin: 10px auto 0;
  color: #ffffff;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.35);
  font-weight: normal;
}

.ranking {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
}

.ranking-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  transition: background 0.2s;
}

.ranking-item:last-child {
  border-bottom: none;
}

.ranking-item.open {
  background: rgba(255, 255, 255, 0.07);
}

.ranking-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 6px;
  border-radius: 10px;
  cursor: pointer;
  transition: padding 0.2s, background 0.2s;
}

.ranking-item.open .ranking-row {
  padding-top: 12px;
  padding-bottom: 12px;
}

.ranking-row:focus-visible {
  outline: 2px solid #ffc90e;
}

@media (hover: hover) {
  .ranking-row:hover {
    background: rgba(255, 255, 255, 0.06);
  }
}

.others {
  padding: 0 14px 12px 38px;
  font-size: 14px;
}

.other-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
}

.others .note {
  margin: 0;
}

.ranking-unread {
  font-size: 13px;
  font-style: italic;
  opacity: 0.55;
}

.rank {
  width: 20px;
  text-align: center;
  font-weight: bold;
  opacity: 0.7;
}

.ranking-row .book-cover-small {
  width: 44px;
  transition: width 0.2s;
}

.ranking-item.open .book-cover-small {
  width: 64px;
}

.ranking-text {
  flex: 1;
  min-width: 0;
}

.ranking-title {
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ranking-meta {
  font-size: 12px;
  opacity: 0.75;
}

.ranking-score {
  font-size: 22px;
  font-weight: bold;
  color: #ffc90e;
}

.member-row {
  display: grid;
  grid-template-columns: 90px 1fr 36px;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
  font-size: 14px;
}

.member-row.me {
  color: #ffc90e;
  font-weight: bold;
}

.member-bar {
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.member-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #ffc90e;
}

.member-average {
  text-align: right;
}

.share-text {
  box-sizing: border-box;
  width: 100%;
  height: 150px;
  padding: 10px;
  font-family: "Quicksand", sans-serif;
  font-size: 14px;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  resize: none;
}
</style>
