<template>
  <BookDialog :open="open" title="Edit book" :book="book" @close="$emit('close')">
    <!-- The book is null again as soon as the dialog closes, so the form must not render then -->
    <form v-if="form && book" class="editor" @submit.prevent="save">
      <label>
        <span>Title</span>
        <input v-model="form.title" type="text" maxlength="300" required />
      </label>
      <div class="editor-row">
        <label>
          <span>Pages</span>
          <input v-model="form.pages" type="number" min="1" inputmode="numeric" />
        </label>
        <label>
          <span>Suggested by</span>
          <select v-model="form.suggester">
            <option value="">Nobody</option>
            <option v-for="name in suggesterOptions" :key="name" :value="name">{{ name }}</option>
          </select>
        </label>
      </div>
      <div v-if="book.status !== 'hat'" class="editor-row">
        <label>
          <span>Started reading</span>
          <input v-model="form.startedAt" type="date" :max="today" />
        </label>
        <label v-if="book.status === 'rated'">
          <span>Finished</span>
          <input v-model="form.finishedAt" type="date" :min="form.startedAt || undefined" :max="today" />
        </label>
      </div>
      <div v-if="error" class="dialog-error">{{ error }}</div>
      <button type="submit" class="primary" :disabled="saving">Save changes</button>

      <div class="danger-zone">
        <button v-if="!confirmDelete" type="button" class="secondary danger" @click="confirmDelete = true">
          Delete book
        </button>
        <template v-else>
          <p class="danger-text">
            Delete “{{ book.title }}”<template v-if="book.status !== 'hat'"> and everyone's ratings of it</template>?
            This can't be undone.
          </p>
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

const day = (iso) => (iso ? iso.slice(0, 10) : "");

export default {
  components: { BookDialog },
  props: {
    open: { type: Boolean, default: false },
    book: { type: Object, default: null },
    // Everyone who can be the suggester, former members included
    members: { type: Array, default: () => [] },
  },
  emits: ["close", "saved", "deleted"],
  data() {
    return { form: null, saving: false, error: "", confirmDelete: false };
  },
  computed: {
    today() {
      return new Date().toISOString().slice(0, 10);
    },
    suggesterOptions() {
      const names = new Set(this.members);
      if (this.book?.suggester) names.add(this.book.suggester);
      return [...names].sort();
    },
  },
  watch: {
    open(open) {
      if (!open || !this.book) return;
      this.form = {
        title: this.book.title,
        pages: this.book.pages || "",
        suggester: this.book.suggester || "",
        startedAt: day(this.book.startedAt),
        finishedAt: day(this.book.finishedAt),
      };
      this.error = "";
      this.confirmDelete = false;
    },
  },
  methods: {
    async save() {
      this.saving = true;
      this.error = "";
      const body = {
        title: this.form.title,
        pages: this.form.pages === "" ? null : Number(this.form.pages),
        suggester: this.form.suggester || null,
      };
      if (this.book.status !== "hat") body.startedAt = this.form.startedAt || null;
      if (this.book.status === "rated") body.finishedAt = this.form.finishedAt || null;
      try {
        const { data } = await api.put(`/books/${this.book.id}`, body);
        this.$emit("saved", data);
      } catch (error) {
        this.error = errorMessage(error);
      } finally {
        this.saving = false;
      }
    },
    async remove() {
      this.saving = true;
      this.error = "";
      try {
        // The server only accepts JSON writes, so send an empty JSON body
        await api.delete(`/books/${this.book.id}`, { data: {} });
        this.$emit("deleted", this.book.id);
      } catch (error) {
        this.error = errorMessage(error);
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style>
.editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
}

.editor label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
  font-size: 13px;
}

.editor label span {
  opacity: 0.8;
}

.editor-row {
  display: flex;
  gap: 10px;
}

.editor input,
.editor select {
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  margin: 0;
  padding: 0 10px;
  font-family: "Quicksand", sans-serif;
  font-size: 15px;
  color: #ffffff;
  color-scheme: dark;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  box-shadow: none;
}

.editor select option {
  color: #1d1729;
}

.danger-zone {
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  text-align: center;
}

.dialog-card .secondary.danger {
  color: #ff7b7b;
  border-color: rgba(255, 123, 123, 0.5);
}

.dialog-card .primary.danger-fill {
  color: #ffffff;
  background: #d64545;
}

.danger-text {
  margin: 0;
  font-size: 14px;
}
</style>
