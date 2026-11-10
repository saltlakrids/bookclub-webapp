<template>
  <BookDialog :open="open" :title="meetup ? 'Edit meetup' : 'Plan a meetup'" @close="$emit('close')">
    <form v-if="form" class="editor" @submit.prevent="save">
      <div class="kind-toggle" role="group" aria-label="Type">
        <button type="button" :class="{ on: form.kind === 'meetup' }" @click="form.kind = 'meetup'">📚 Meetup</button>
        <button type="button" :class="{ on: form.kind === 'party' }" @click="form.kind = 'party'">🎉 Party</button>
      </div>
      <div class="editor-row">
        <label>
          <span>Date</span>
          <input v-model="form.date" type="date" required />
        </label>
        <label>
          <span>Time</span>
          <input v-model="form.time" type="time" required />
        </label>
      </div>
      <label>
        <span>Description</span>
        <textarea v-model="form.description" rows="2" maxlength="500" :placeholder="form.kind === 'party' ? 'Christmas party at Chris\'s' : 'Where, what to bring...'" />
      </label>
      <template v-if="form.kind === 'meetup'">
        <label>
          <span>Book</span>
          <select v-model="form.bookId">
            <option value="">No book</option>
            <option v-for="b in books" :key="b.id" :value="b.id">{{ b.title }}</option>
          </select>
        </label>
        <label v-if="form.bookId !== ''">
          <span>Read up to page (optional)</span>
          <input v-model="form.readToPage" type="number" min="1" :max="selectedBook && selectedBook.pages || undefined" inputmode="numeric"
            :placeholder="selectedBook && selectedBook.pages ? `1 – ${selectedBook.pages}` : ''" />
        </label>
        <p v-if="form.readToPage !== ''" class="hint">Members who are behind get a reminder a week before.</p>
      </template>
      <div v-if="error" class="dialog-error">{{ error }}</div>
      <button type="submit" class="primary" :disabled="saving">{{ meetup ? "Save changes" : "Create meetup" }}</button>

      <div v-if="meetup" class="danger-zone">
        <button v-if="!confirmDelete" type="button" class="secondary danger" @click="confirmDelete = true">Delete meetup</button>
        <template v-else>
          <p class="danger-text">Delete this meetup? This can't be undone.</p>
          <button type="button" class="primary danger-fill" :disabled="saving" @click="remove">Yes, delete it</button>
          <button type="button" class="secondary" @click="confirmDelete = false">Keep it</button>
        </template>
      </div>
    </form>
  </BookDialog>
</template>

<script>
import api, { errorMessage } from "@/api";
import BookDialog from "@/components/BookDialog.vue";

const pad = (n) => String(n).padStart(2, "0");

export default {
  components: { BookDialog },
  props: {
    open: { type: Boolean, default: false },
    // The meetup being edited, or null for a new one
    meetup: { type: Object, default: null },
    // Books that can be read for a meetup
    books: { type: Array, default: () => [] },
  },
  emits: ["close", "saved", "deleted"],
  data() {
    return { form: null, saving: false, error: "", confirmDelete: false };
  },
  computed: {
    selectedBook() {
      return this.books.find((b) => b.id === this.form?.bookId) || null;
    },
  },
  watch: {
    open: {
      handler(open) {
        if (open) this.reset();
      },
      immediate: true,
    },
    "form.kind"(kind) {
      if (kind === "party" && this.form) Object.assign(this.form, { bookId: "", readToPage: "" });
    },
    "form.bookId"(id, old) {
      if (old !== undefined && id === "" && this.form) this.form.readToPage = "";
    },
  },
  methods: {
    reset() {
      this.error = "";
      this.confirmDelete = false;
      if (this.meetup) {
        const d = new Date(this.meetup.startsAt);
        this.form = {
          kind: this.meetup.kind,
          date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
          time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
          description: this.meetup.description,
          bookId: this.meetup.book ? this.meetup.book.id : "",
          readToPage: this.meetup.readToPage || "",
        };
      } else {
        // A new meetup is about the book being read right now
        this.form = { kind: "meetup", date: "", time: "19:00", description: "", bookId: this.books[0]?.id ?? "", readToPage: "" };
      }
    },
    async save() {
      this.saving = true;
      this.error = "";
      const party = this.form.kind === "party";
      const body = {
        kind: this.form.kind,
        // Entered in the phone's own time, stored as UTC
        startsAt: new Date(`${this.form.date}T${this.form.time}`).toISOString(),
        description: this.form.description,
        bookId: party || this.form.bookId === "" ? null : this.form.bookId,
        readToPage: party || this.form.readToPage === "" ? null : Number(this.form.readToPage),
      };
      try {
        const { data } = this.meetup ? await api.put(`/meetups/${this.meetup.id}`, body) : await api.post("/meetups", body);
        this.$emit("saved", data);
      } catch (error) {
        this.error = error.response ? errorMessage(error) : "Pick a date and time.";
      } finally {
        this.saving = false;
      }
    },
    async remove() {
      this.saving = true;
      this.error = "";
      try {
        await api.delete(`/meetups/${this.meetup.id}`, { data: {} });
        this.$emit("deleted", this.meetup.id);
      } catch (error) {
        this.error = errorMessage(error);
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style scoped>
.kind-toggle {
  display: flex;
  gap: 8px;
}

.kind-toggle button {
  flex: 1;
  height: 42px;
  margin: 0;
  font-family: "Quicksand", sans-serif;
  font-size: 15px;
  font-weight: bold;
  color: #fff;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  cursor: pointer;
}

.kind-toggle button.on {
  color: #1d1729;
  background: #ffc90e;
  border-color: #ffc90e;
}

textarea {
  box-sizing: border-box;
  width: 100%;
  margin: 0;
  padding: 8px 10px;
  font-family: "Quicksand", sans-serif;
  font-size: 15px;
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  resize: vertical;
}

.hint {
  margin: 0;
  font-size: 12px;
  opacity: 0.75;
}
</style>
