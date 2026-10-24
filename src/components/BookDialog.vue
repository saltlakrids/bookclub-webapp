<template>
  <dialog ref="dialog" class="book-dialog" @cancel.prevent="$emit('close')" @click="onBackdropClick">
    <!-- The browser's own <dialog>: Esc closes it, focus stays inside, and it sits above everything. -->
    <div class="dialog-card">
      <button type="button" class="dialog-close" aria-label="Close" @click="$emit('close')">&times;</button>
      <div v-if="book" class="dialog-book">
        <BookCover :book="book" size="small" />
        <div class="dialog-book-text">
          <h2>{{ title }}</h2>
          <p class="dialog-book-title">{{ book.title }}</p>
          <p v-if="subtitle" class="dialog-subtitle">{{ subtitle }}</p>
        </div>
      </div>
      <h2 v-else>{{ title }}</h2>
      <slot />
    </div>
  </dialog>
</template>

<script>
import BookCover from "@/components/BookCover.vue";

export default {
  components: { BookCover },
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, required: true },
    // Shown with its cover at the top, so you can see which book the dialog is about
    book: { type: Object, default: null },
    subtitle: { type: String, default: "" },
  },
  emits: ["close"],
  watch: {
    open: {
      handler(open) {
        this.$nextTick(() => {
          const dialog = this.$refs.dialog;
          if (!dialog) return;
          if (open && !dialog.open) dialog.showModal();
          if (!open && dialog.open) dialog.close();
        });
      },
      immediate: true,
    },
  },
  methods: {
    // A click on the dimmed area around the card lands on the <dialog> itself
    onBackdropClick(event) {
      if (event.target === this.$refs.dialog) this.$emit("close");
    },
  },
};
</script>

<style>
.book-dialog {
  padding: 0;
  border: none;
  background: transparent;
  max-width: min(440px, calc(100vw - 32px));
  width: 100%;
  overflow: visible;
  color: #ffffff;
  font-family: "Quicksand", sans-serif;
}

.book-dialog::backdrop {
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(3px);
}

.book-dialog[open] .dialog-card {
  animation: dialogIn 0.25s ease-out;
}

.dialog-card {
  position: relative;
  box-sizing: border-box;
  background: linear-gradient(160deg, rgba(42, 34, 60, 0.97), rgba(20, 16, 30, 0.97));
  border: 1px solid rgba(255, 201, 14, 0.45);
  border-radius: 16px;
  padding: 24px 20px 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  text-align: center;
  text-shadow: none;
}

.dialog-card h2 {
  margin: 0 0 4px;
  font-size: 20px;
  color: #ffc90e;
}

.dialog-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 36px;
  height: 36px;
  margin: 0;
  padding: 0;
  font-size: 26px;
  line-height: 1;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.dialog-close:hover {
  background: rgba(255, 255, 255, 0.18);
}

.dialog-book {
  display: flex;
  gap: 14px;
  align-items: center;
  text-align: left;
  margin-bottom: 14px;
  padding-right: 28px;
}

.dialog-book-text {
  min-width: 0;
}

.dialog-book-title {
  margin: 0;
  font-weight: bold;
  font-size: 16px;
}

.dialog-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  opacity: 0.75;
}

/* Buttons inside dialogs */
.dialog-card .primary,
.dialog-card .secondary {
  display: block;
  width: 100%;
  height: 48px;
  margin: 12px 0 0;
  font-family: "Quicksand", sans-serif;
  font-size: 16px;
  font-weight: bold;
  border-radius: 10px;
  cursor: pointer;
}

.dialog-card .primary {
  color: #1d1729;
  background: #ffc90e;
  border: none;
}

.dialog-card .primary:disabled {
  opacity: 0.5;
  cursor: default;
}

.dialog-card .secondary {
  height: 40px;
  font-size: 14px;
  font-weight: normal;
  color: #ffffff;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.35);
}

.dialog-card .dialog-error {
  color: #ff7b7b;
  font-size: 14px;
  margin-top: 10px;
}

@keyframes dialogIn {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .book-dialog[open] .dialog-card {
    animation: none;
  }
}
</style>
