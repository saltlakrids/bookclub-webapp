<template>
  <div class="book-card">
    <div class="book-card-cover">
      <BookCover ref="cover" :book="book" />
      <button v-if="canAddCover && !book.image" type="button" class="add-cover" @click="$emit('add-cover', book)">
        + Add cover
      </button>
      <button v-if="editable" type="button" class="edit-book" aria-label="Edit book" title="Edit or delete" @click="$emit('edit', book)">
        ✎
      </button>
    </div>
    <div class="book-card-title" :title="book.title">{{ book.title }}</div>
    <div class="book-card-meta">
      <slot name="meta" />
    </div>
    <div class="book-card-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script>
import BookCover from "@/components/BookCover.vue";

export default {
  components: { BookCover },
  props: {
    book: { type: Object, required: true },
    // Books already in the club's list can get a cover afterwards
    canAddCover: { type: Boolean, default: false },
    // Shows the ✎ button that opens the edit/delete dialog
    editable: { type: Boolean, default: false },
  },
  emits: ["add-cover", "edit"],
  methods: {
    // The cover element, for the fly-into-the-hat animation
    coverElement() {
      return this.$refs.cover?.$el || null;
    },
  },
};
</script>

<style>
/* Same-sized cards in even rows: 2 per row on a phone, more on wider screens */
.book-grid {
  position: relative;
  z-index: 99;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 190px));
  justify-content: center;
  gap: 18px;
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 16px;
  box-sizing: border-box;
}

@media (max-width: 400px) {
  .book-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

.book-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 10px;
  border-radius: 12px;
  background: rgba(20, 16, 30, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
}

/* Full width so the cover is centred in the card whatever its own size */
.book-card-cover {
  position: relative;
  display: flex;
  justify-content: center;
  width: 100%;
}

.book-card .book-cover-normal {
  width: min(140px, 100%);
}

.edit-book {
  position: absolute;
  top: 6px;
  right: calc(50% - min(70px, 50%) + 6px);
  width: 30px;
  height: 30px;
  margin: 0;
  padding: 0;
  font-size: 15px;
  line-height: 1;
  color: #ffffff;
  background: rgba(20, 16, 30, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  cursor: pointer;
}

.add-cover {
  position: absolute;
  left: 50%;
  bottom: 8px;
  transform: translateX(-50%);
  width: auto;
  height: auto;
  margin: 0;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: bold;
  color: #1d1729;
  background: #ffc90e;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
}

.book-card-title {
  margin-top: 10px;
  font-size: 14px;
  font-weight: bold;
  line-height: 1.3;
  min-height: 2.6em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.book-card-meta {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.45;
  opacity: 0.85;
}

/* Buttons sit at the bottom, so they line up across a row */
.book-card-actions {
  margin-top: auto;
  padding-top: 10px;
  width: 100%;
}

.book-card-actions button {
  width: 100%;
  max-width: 180px;
  height: 40px;
  margin-top: 6px;
  font-size: 14px;
}
</style>
