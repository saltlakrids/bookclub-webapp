<template>
  <div class="book-cover" :class="`book-cover-${size}`">
    <!-- Every cover gets the same 2:3 box, so rows of books line up whatever the image size -->
    <!-- Cover services answer "no cover" with a broken or 1-pixel image; both get the made-up cover -->
    <img
      v-if="book.image && !broken"
      :src="book.image"
      :alt="`Cover of ${book.title}`"
      loading="lazy"
      @error="broken = true"
      @load="broken = $event.target.naturalWidth < 10"
    />
    <div v-else class="book-cover-fallback" :style="{ background: fallbackColor }">
      <span>{{ book.title }}</span>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    book: { type: Object, required: true },
    // small: thumbnails in dialogs and the hat list; normal: book cards
    size: { type: String, default: "normal" },
  },
  data() {
    return { broken: false };
  },
  computed: {
    // A stable colour per title, so the same coverless book always looks the same
    fallbackColor() {
      let hash = 0;
      for (const char of this.book.title || "") hash = (hash * 31 + char.charCodeAt(0)) % 360;
      return `linear-gradient(160deg, hsl(${hash}, 45%, 38%), hsl(${(hash + 40) % 360}, 50%, 20%))`;
    },
  },
  watch: {
    "book.image"() {
      this.broken = false;
    },
  },
};
</script>

<style>
.book-cover {
  position: relative;
  flex: none;
  aspect-ratio: 2 / 3;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.55);
  background: rgba(255, 255, 255, 0.06);
}

.book-cover-normal {
  width: 140px;
}

.book-cover-small {
  width: 64px;
  border-radius: 4px;
}

.book-cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.book-cover-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 10px;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: inherit;
}

.book-cover-fallback span {
  font-size: 14px;
  font-weight: bold;
  line-height: 1.25;
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.book-cover-small .book-cover-fallback {
  padding: 4px;
}

.book-cover-small .book-cover-fallback span {
  font-size: 9px;
  -webkit-line-clamp: 5;
}
</style>
