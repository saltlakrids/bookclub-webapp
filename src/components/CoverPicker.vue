<template>
  <BookDialog :open="open" title="Choose a cover" :book="book" @close="$emit('close')">
    <p class="cover-hint">Tap one of the covers found for this title, or paste a link to an image.</p>
    <div v-if="searching" class="cover-status">Looking for covers...</div>
    <div v-else-if="candidates.length" class="cover-options">
      <button
        v-for="url in candidates"
        :key="url"
        type="button"
        class="cover-option"
        :class="{ chosen: url === chosen }"
        @click="chosen = url"
      >
        <img :src="url" alt="Cover option" @error="drop(url)" @load="dropIfBlank($event, url)" />
      </button>
    </div>
    <div v-else class="cover-status">No covers found for this title.</div>

    <input v-model.trim="pasted" class="cover-url" type="url" placeholder="https://... (image link)" @input="chosen = ''" />
    <div v-if="preview" class="cover-preview">
      <BookCover :book="{ title: book ? book.title : '', image: preview }" size="small" />
    </div>
    <div v-if="error" class="dialog-error">{{ error }}</div>
    <button type="button" class="primary" :disabled="!preview || saving" @click="save">Use this cover</button>
  </BookDialog>
</template>

<script>
import api, { errorMessage } from "@/api";
import BookCover from "@/components/BookCover.vue";
import BookDialog from "@/components/BookDialog.vue";

export default {
  components: { BookCover, BookDialog },
  props: {
    open: { type: Boolean, default: false },
    book: { type: Object, default: null },
    // Only choose, don't save: used while adding a book that isn't in the club yet
    chooseOnly: { type: Boolean, default: false },
  },
  emits: ["close", "chosen"],
  data() {
    return { candidates: [], searching: false, chosen: "", pasted: "", saving: false, error: "" };
  },
  computed: {
    preview() {
      if (this.chosen) return this.chosen;
      return /^https?:\/\/\S+$/.test(this.pasted) ? this.pasted : "";
    },
  },
  watch: {
    open(open) {
      if (open) this.load();
    },
  },
  methods: {
    // Covers from the same search the Add Book page uses, matched on the title
    async load() {
      this.candidates = [];
      this.chosen = "";
      this.pasted = "";
      this.error = "";
      if (!this.book) return;
      this.searching = true;
      try {
        const { data } = await api.get("/search", { params: { q: this.book.title.slice(0, 200) } });
        this.candidates = [...new Set(data.map((b) => b.image).filter(Boolean))].slice(0, 12);
      } catch {
        this.candidates = [];
      } finally {
        this.searching = false;
      }
    },
    // Cover services answer missing covers with a broken or 1-pixel image; leave those out
    drop(url) {
      this.candidates = this.candidates.filter((c) => c !== url);
      if (this.chosen === url) this.chosen = "";
    },
    dropIfBlank(event, url) {
      if (event.target.naturalWidth < 10) this.drop(url);
    },
    async save() {
      if (!this.preview) return;
      if (this.chooseOnly) {
        this.$emit("chosen", this.preview);
        return;
      }
      this.saving = true;
      this.error = "";
      try {
        await api.put(`/books/${this.book.id}/image`, { image: this.preview });
        this.$emit("chosen", this.preview);
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
.cover-hint {
  font-size: 13px;
  opacity: 0.8;
  margin: 0 0 12px;
}

.cover-status {
  font-size: 14px;
  opacity: 0.8;
  padding: 16px 0;
}

.cover-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  max-height: 260px;
  overflow-y: auto;
  padding: 2px;
}

.cover-option {
  width: auto;
  height: auto;
  margin: 0;
  padding: 0;
  aspect-ratio: 2 / 3;
  border: 2px solid transparent;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
}

.cover-option img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-option.chosen {
  border-color: #ffc90e;
  box-shadow: 0 0 0 2px rgba(255, 201, 14, 0.4);
}

.cover-url {
  box-sizing: border-box;
  width: 100%;
  height: 42px;
  margin-top: 14px;
  padding: 0 12px;
  font-family: "Quicksand", sans-serif;
  font-size: 14px;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 10px;
}

.cover-preview {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}
</style>
