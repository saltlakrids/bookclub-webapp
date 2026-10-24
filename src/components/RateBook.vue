<template>
  <div>
    <h2 class="heading">Rate Book</h2>
    <div>
      <h3 class="heading">Waiting to be rated</h3>
      <div v-if="waitingToBeRated.length > 0" class="book-grid waiting">
        <BookCard v-for="book in waitingToBeRated" :key="book.id" :book="book" can-add-cover editable @add-cover="openCoverPicker" @edit="editBook = $event">
          <template #meta>
            <div v-if="book.pages">{{ book.pages }} pages</div>
            <div v-if="book.suggester">Suggested by {{ book.suggester }}</div>
            <div v-if="book.startedAt">Reading for {{ formatDuration(daysSince(book.startedAt)) }}</div>
            <div class="rating-status">
              <div v-if="book.myRating" class="my-status">
                {{ book.myRating.skipped ? "You skipped this one" : `Your rating: ${book.myRating.score}` }}
              </div>
              <div>Waiting for {{ book.waitingFor.join(", ") }}</div>
            </div>
          </template>
          <template #actions>
            <button @click="openModal(book)">{{ book.myRating ? "Change rating" : "Rate" }}</button>
          </template>
        </BookCard>
      </div>
      <p v-else class="no-books-waiting">No books waiting for rating.</p>

      <h3 class="heading">Read and rated books</h3>
      <div v-if="readAndRated.length" class="club-summary">
        <span><strong>{{ summary.books }}</strong> books</span>
        <span><strong>{{ summary.pages.toLocaleString("en-GB") }}</strong> pages</span>
        <span v-if="summary.averageDays !== null">about <strong>{{ formatDuration(summary.averageDays) }}</strong> per book</span>
        <span v-if="summary.averageScore !== null">average score <strong>{{ summary.averageScore.toFixed(1) }}</strong></span>
      </div>
      <div class="sorting-options sort-show">
        <select v-model="sortOption" @change="sortReadAndRatedBooks">
          <option value="default">Sort List</option>
          <option value="highestScore">Highest Score</option>
          <option value="alphabetical">Alphabetical</option>
          <option value="suggester">Suggester Name</option>
          <option value="pages">Number of Pages</option>
          <option value="readingTime">Reading Time</option>
          <option value="spread">Most Split Opinions</option>
          <option v-for="name in raters" :key="name" :value="`rating:${name}`">
            {{ name }}'s Rating
          </option>
        </select>
      </div>
      <div class="book-grid read">
        <BookCard v-for="book in readAndRated" :key="book.id" :book="book" can-add-cover editable @add-cover="openCoverPicker" @edit="editBook = $event">
          <template #meta>
            <div class="average-rating">★ {{ calculateAverageRating(book) }}</div>
            <div v-if="myScore(book) !== undefined" class="my-score">
              You: {{ myScore(book) === null ? "skipped" : myScore(book) }}
            </div>
            <div v-if="book.suggester">Suggested by {{ book.suggester }}</div>
            <div v-if="book.pages">{{ book.pages }} pages</div>
            <div v-if="readingDays(book) !== null">
              Read in {{ formatDuration(readingDays(book)) }}<template v-if="book.pages">
                · {{ Math.round(book.pages / readingDays(book)) }} pages/day</template>
            </div>
            <div v-if="book.finishedAt" class="book-finished">Finished {{ formatMonth(book.finishedAt) }}</div>
            <div v-if="agreementLabel(book)" class="agreement">{{ agreementLabel(book) }}</div>
            <div v-if="book.showScores" class="individual-ratings">
              <div v-for="rating in book.ratings" :key="rating.member" class="individual-row">
                <span>{{ rating.member }}</span>
                <span>{{ rating.score === null ? "skipped" : rating.score }}</span>
              </div>
            </div>
          </template>
          <template #actions>
            <button @click="toggleScores(book)">{{ book.showScores ? "Hide scores" : "Individual Scores" }}</button>
          </template>
        </BookCard>
      </div>
    </div>

    <BookDialog
      :open="isModalOpen"
      :title="selectedBook && selectedBook.myRating ? 'Change your rating' : 'Rate this book'"
      :book="selectedBook"
      subtitle="Scores stay hidden until everyone has rated."
      @close="closeModal"
    >
      <form @submit.prevent="rateBook(selectedBook, myRating)">
        <div class="score-display" aria-live="polite">
          <span class="score-number">{{ myRating.toFixed(1) }}</span>
          <span class="score-out-of">/ 10</span>
        </div>
        <div class="score-controls">
          <button type="button" class="step" aria-label="Half a point less" @click="step(-0.5)">−</button>
          <input
            v-model.number="myRating"
            class="score-slider"
            type="range"
            min="1"
            max="10"
            step="0.5"
            :aria-label="`${session.member.name}'s score`"
          />
          <button type="button" class="step" aria-label="Half a point more" @click="step(0.5)">+</button>
        </div>
        <div class="score-scale"><span>1</span><span>10</span></div>
        <div v-if="error" class="dialog-error">{{ error }}</div>
        <button type="submit" class="primary" :disabled="isSaving">Save {{ myRating.toFixed(1) }}</button>
        <button type="button" class="secondary" :disabled="isSaving" @click="rateBook(selectedBook, null)">
          Skip, I didn't read it
        </button>
      </form>
    </BookDialog>

    <CoverPicker :open="coverBook !== null" :book="coverBook" @close="coverBook = null" @chosen="coverChosen" />
    <BookEditor
      :open="editBook !== null"
      :book="editBook"
      :members="allMembers"
      @close="editBook = null"
      @saved="afterEdit"
      @deleted="afterEdit"
    />
  </div>
</template>

<script>
import api, { session, errorMessage } from "@/api";
import BookCard from "@/components/BookCard.vue";
import BookDialog from "@/components/BookDialog.vue";
import BookEditor from "@/components/BookEditor.vue";
import CoverPicker from "@/components/CoverPicker.vue";
import { agreementLabel, clubSummary, formatDuration, readingDays, scoreOf, spread } from "@/stats";

export default {
  components: { BookCard, BookDialog, BookEditor, CoverPicker },
  data() {
    return {
      session,
      waitingToBeRated: [],
      readAndRated: [],
      raters: [],
      isModalOpen: false,
      isSaving: false,
      selectedBook: null,
      myRating: 7,
      error: "",
      sortOption: "default",
      coverBook: null,
      editBook: null,
      members: [],
    };
  },
  computed: {
    // Former members only appear as raters, but can still be a suggester of old books
    allMembers() {
      return [...new Set([...this.members, ...this.raters])];
    },

    summary() {
      return clubSummary(this.readAndRated);
    },
  },
  methods: {
    readingDays,
    formatDuration,
    agreementLabel,

    daysSince(date) {
      return Math.max(1, Math.round((Date.now() - new Date(date)) / 86400000));
    },

    myScore(book) {
      return scoreOf(book, session.member.name);
    },

    step(delta) {
      this.myRating = Math.max(1, Math.min(10, this.myRating + delta));
    },

    async rateBooks() {
      try {
        const { data } = await api.get("/books");
        this.waitingToBeRated = data.reading;
        this.readAndRated = data.rated.map((book) => ({ ...book, showScores: false }));
        this.raters = data.raters;
        this.members = data.members;
        this.sortReadAndRatedBooks();
      } catch (error) {
        console.error("Error fetching books:", error);
      }
    },

    toggleScores(book) {
      book.showScores = !book.showScores;
    },

    openModal(book) {
      this.selectedBook = book;
      this.myRating = book.myRating && !book.myRating.skipped ? book.myRating.score : 7;
      this.error = "";
      this.isModalOpen = true;
    },

    closeModal() {
      this.isModalOpen = false;
    },

    openCoverPicker(book) {
      this.coverBook = book;
    },

    async afterEdit() {
      this.editBook = null;
      await this.rateBooks();
    },

    coverChosen(url) {
      this.coverBook.image = url;
      this.coverBook = null;
    },

    // score null means skip
    async rateBook(book, score) {
      if (!book || this.isSaving) {
        return;
      }

      this.isSaving = true;
      this.error = "";
      try {
        await api.put(`/books/${book.id}/rating`, { score });
        this.closeModal();
        await this.rateBooks();
      } catch (error) {
        console.error("Error rating the book:", error);
        this.error = errorMessage(error);
      } finally {
        this.isSaving = false;
      }
    },

    calculateAverageRating(book) {
      return book.average === null ? "No ratings" : book.average.toFixed(1);
    },

    formatMonth(date) {
      return new Date(date).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    },

    sortReadAndRatedBooks() {
      switch (this.sortOption) {
        case "default":
          this.readAndRated.sort((a, b) => (b.finishedAt || "").localeCompare(a.finishedAt || ""));
          break;

        case "highestScore":
          this.readAndRated.sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
          break;

        case "alphabetical":
          this.readAndRated.sort((a, b) => {
            return a.title.localeCompare(b.title);
          });
          break;

        case "pages":
          this.readAndRated.sort((a, b) => (b.pages || 0) - (a.pages || 0));
          break;

        case "readingTime":
          this.readAndRated.sort((a, b) => (readingDays(b) ?? -1) - (readingDays(a) ?? -1));
          break;

        case "spread":
          this.readAndRated.sort((a, b) => (spread(b) ?? -1) - (spread(a) ?? -1));
          break;

        case "suggester":
          this.readAndRated.sort((a, b) =>
            (a.suggester || "").localeCompare(b.suggester || "")
          );
          break;

        default:
          if (this.sortOption.startsWith("rating:")) {
            const name = this.sortOption.slice("rating:".length);
            // Books the person did not rate go to the bottom
            this.readAndRated.sort((a, b) => (scoreOf(b, name) ?? -1) - (scoreOf(a, name) ?? -1));
          }
          break;
      }
    },
  },
  created() {
    this.rateBooks();
  },
};
</script>

<style scoped>
.sorting-options {
  margin-bottom: 20px;
  position: relative;
  z-index: 101;
  animation: headingAnimation 1s ease-in-out forwards;
}

select {
  padding: 8px;
  font-size: 14px;
  font-family: "Quicksand", sans-serif;
  border-radius: 7px;
}

.heading {
  position: relative;
  z-index: 99;
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

.club-summary {
  position: relative;
  z-index: 99;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 18px;
  margin: 0 16px 14px;
  font-size: 14px;
  opacity: 0.9;
}

.club-summary strong {
  color: #ffc90e;
}

.rating-status {
  margin-top: 6px;
}

.my-status,
.my-score {
  color: #ffc90e;
}

.average-rating {
  font-size: 15px;
  font-weight: bold;
}

.book-finished {
  opacity: 0.8;
}

.agreement {
  display: inline-block;
  margin-top: 4px;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 201, 14, 0.5);
  color: #ffc90e;
}

.individual-ratings {
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.individual-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.no-books-waiting {
  color: #0df40d;
  position: relative;
  z-index: 99;
  animation: headingAnimation 1s ease-in-out forwards;
}

.waiting {
  margin-bottom: 10px;
}

.read {
  padding-bottom: 40px;
}

/* The rating dialog */
.score-display {
  margin: 6px 0 4px;
}

.score-number {
  font-size: 54px;
  font-weight: bold;
  color: #ffc90e;
}

.score-out-of {
  font-size: 18px;
  opacity: 0.7;
  margin-left: 4px;
}

.score-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.score-slider {
  flex: 1;
  accent-color: #ffc90e;
  height: 28px;
  margin: 0;
}

.step {
  flex: none;
  width: 40px;
  height: 40px;
  margin: 0;
  padding: 0;
  font-size: 22px;
  line-height: 1;
  color: #1d1729;
  background: #ffc90e;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.score-scale {
  display: flex;
  justify-content: space-between;
  padding: 0 50px;
  font-size: 12px;
  opacity: 0.6;
}
</style>
