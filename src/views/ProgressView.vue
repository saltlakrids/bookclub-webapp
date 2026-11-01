<template>
  <div class="progress-page">
    <h2 class="heading">Reading progress</h2>
    <p v-if="loading" class="note">Loading...</p>
    <p v-else-if="loadError" class="note error">{{ loadError }}</p>
    <p v-else-if="books.length === 0" class="note">Nothing is being read right now. Pick a book from the hat first.</p>

    <section v-for="book in books" :key="book.id" class="panel">
      <div class="book-head">
        <BookCover :book="book" size="small" />
        <div>
          <h3>{{ book.title }}</h3>
          <p class="note small">
            <template v-if="book.pages">{{ book.pages }} pages · </template>started {{ formatDate(book.startedAt) }}
          </p>
        </div>
      </div>

      <div v-for="member in book.members" :key="member.name" class="reader" :class="{ me: member.name === me }">
        <div class="reader-line">
          <span class="reader-name">{{ member.name }}</span>
          <span class="reader-numbers">
            <template v-if="member.totalPages">p. {{ member.page }} / {{ member.totalPages }}</template>
            <template v-else>p. {{ member.page }}</template>
            <strong v-if="member.percent !== null"> · {{ member.percent }} %</strong>
          </span>
        </div>
        <div class="health" :title="`${member.percent ?? 0} %`">
          <span :class="barClass(member.percent)" :style="{ width: `${member.percent ?? 0}%` }" />
        </div>
        <div class="reader-meta">
          <span v-if="member.weekPages">+{{ member.weekPages }} pages this week</span>
          <span v-if="member.updatedAt">updated {{ ago(member.updatedAt) }}</span>
          <span v-if="member.ownEdition">own edition</span>
        </div>
      </div>

      <p class="standing">{{ standing(book) }}</p>

      <div class="update">
        <div class="quick">
          <button v-for="n in [10, 20, 50]" :key="n" type="button" :disabled="busy" @click="save(book, { add: n })">
            +{{ n }}
          </button>
        </div>
        <form class="row" @submit.prevent="savePage(book)">
          <label>
            I'm on page
            <input v-model="pageInput[book.id]" type="number" min="0" inputmode="numeric" :placeholder="String(mine(book).page)" />
          </label>
          <button type="submit" class="small" :disabled="busy || pageInput[book.id] === undefined || pageInput[book.id] === ''">Save</button>
        </form>
        <details class="edition">
          <summary>My edition has a different number of pages</summary>
          <form class="row" @submit.prevent="saveEdition(book)">
            <label>
              Pages
              <input v-model="editionInput[book.id]" type="number" min="1" inputmode="numeric" :placeholder="String(mine(book).totalPages || '')" />
            </label>
            <button type="submit" class="small" :disabled="busy || !editionInput[book.id]">Save</button>
          </form>
          <button v-if="mine(book).ownEdition" type="button" class="link" :disabled="busy" @click="save(book, { totalPages: null })">
            Use the book's {{ book.pages }} pages again
          </button>
        </details>
        <p v-if="errors[book.id]" class="note error">{{ errors[book.id] }}</p>
      </div>
    </section>

    <NotificationSettings v-if="!loading" />
  </div>
</template>

<script>
import api, { session, errorMessage } from "@/api";
import BookCover from "@/components/BookCover.vue";
import NotificationSettings from "@/components/NotificationSettings.vue";

export default {
  components: { BookCover, NotificationSettings },
  data() {
    return { books: [], loading: true, loadError: "", busy: false, pageInput: {}, editionInput: {}, errors: {} };
  },
  computed: {
    me() {
      return session.member.name;
    },
  },
  async created() {
    try {
      const { data } = await api.get("/progress");
      this.books = data;
    } catch (error) {
      this.loadError = errorMessage(error);
    } finally {
      this.loading = false;
    }
  },
  methods: {
    mine(book) {
      return book.members.find((m) => m.name === this.me) || { page: 0, totalPages: book.pages, ownEdition: false };
    },
    async save(book, body) {
      this.busy = true;
      this.errors[book.id] = "";
      try {
        const { data } = await api.put(`/books/${book.id}/progress`, body);
        this.books = this.books.map((b) => (b.id === data.id ? data : b));
        return true;
      } catch (error) {
        this.errors[book.id] = errorMessage(error);
        return false;
      } finally {
        this.busy = false;
      }
    },
    async savePage(book) {
      if (await this.save(book, { page: Number(this.pageInput[book.id]) })) this.pageInput[book.id] = "";
    },
    async saveEdition(book) {
      if (await this.save(book, { totalPages: Number(this.editionInput[book.id]) })) this.editionInput[book.id] = "";
    },
    barClass(percent) {
      if (percent === null || percent < 34) return "low";
      if (percent < 67) return "mid";
      return "high";
    },
    // How I stand against the leader, in pages of my own edition
    standing(book) {
      const me = this.mine(book);
      const others = book.members.filter((m) => m.name !== this.me && m.percent !== null);
      if (me.percent === null || others.length === 0) return "";
      const leader = others.reduce((a, b) => (b.percent > a.percent ? b : a));
      if (me.percent >= 100) return "You have finished the book. Time to rate it!";
      if (me.percent > leader.percent) return "You are in the lead!";
      if (me.percent === leader.percent) return `You are level with ${leader.name}.`;
      const behind = Math.round(((leader.percent - me.percent) / 100) * me.totalPages);
      return `You are ${behind} pages behind ${leader.name}.`;
    },
    formatDate(iso) {
      return iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
    },
    ago(iso) {
      const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
      if (minutes < 1) return "just now";
      if (minutes < 60) return `${minutes} min ago`;
      const hours = Math.round(minutes / 60);
      if (hours < 24) return `${hours} h ago`;
      const days = Math.round(hours / 24);
      return days === 1 ? "yesterday" : `${days} days ago`;
    },
  },
};
</script>

<style scoped>
.progress-page {
  position: relative;
  z-index: 99;
  max-width: 640px;
  margin: 0 auto;
  padding: 0 16px 48px;
}

.note {
  opacity: 0.85;
}

.note.small {
  font-size: 12px;
  margin: 4px 0 0;
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

.book-head {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

.book-head h3 {
  margin: 0;
  color: #ffc90e;
}

.reader {
  padding: 6px 0;
}

.reader.me .reader-name {
  color: #ffc90e;
}

.reader-line {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 14px;
}

.reader-name {
  font-weight: bold;
}

.health {
  height: 14px;
  margin: 5px 0 3px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.25);
  overflow: hidden;
}

.health span {
  display: block;
  height: 100%;
  transition: width 0.6s ease;
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

.reader-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 12px;
  opacity: 0.7;
}

.standing {
  margin: 12px 0 6px;
  font-weight: bold;
}

.update {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 10px;
}

.quick {
  display: flex;
  gap: 8px;
}

.quick button {
  flex: 1;
  width: auto;
  height: 44px;
  font-size: 18px;
  font-weight: bold;
}

.row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-top: 10px;
}

.row label {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.row input {
  font: inherit;
  font-size: 16px;
  padding: 9px 10px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
}

button.small {
  width: 90px;
  height: 42px;
  margin: 0;
}

button:disabled {
  opacity: 0.5;
  cursor: default;
}

.edition {
  margin-top: 12px;
  font-size: 13px;
}

.edition summary {
  cursor: pointer;
  opacity: 0.85;
}

button.link {
  width: auto;
  height: auto;
  margin-top: 8px;
  padding: 0;
  background: none;
  border: none;
  color: #ffc90e;
  font-size: 13px;
  text-decoration: underline;
}
</style>
