<template>
  <div>
    <h2 class="heading">Rate Book</h2>
    <div>
      <h3 class="heading">Waiting to be rated</h3>
      <div class="book-list waiting">
        <template v-if="waitingToBeRated.length > 0">
          <div
            v-for="book in waitingToBeRated"
            :key="book.id"
            class="book-item"
          >
            <img v-if="book.image" :src="book.image" alt="Book Cover" />
            <div v-else class="no-cover">No Cover Available</div>
            <div class="book-title">{{ book.title }}</div>
            <div v-if="book.pages" class="page-count">
              {{ book.pages }} pages
            </div>
            <div v-if="book.suggester" class="book-suggester">{{ book.suggester }}</div>
            <div class="rating-status">
              <div v-if="book.myRating">
                {{ book.myRating.skipped ? "You skipped this one" : `Your rating: ${book.myRating.score}` }}
              </div>
              <div>Waiting for {{ book.waitingFor.join(", ") }}</div>
            </div>
            <button @click="openModal(book)">
              {{ book.myRating ? "Change rating" : "Rate" }}
            </button>
          </div>
        </template>
        <template v-else>
          <p class="no-books-waiting">No books waiting for rating.</p>
        </template>
      </div>
      <h3 class="heading">Read and rated books</h3>
      <div class="sorting-options sort-show">
        <select v-model="sortOption" @change="sortReadAndRatedBooks">
          <option value="default">Sort List</option>
          <option value="highestScore">Highest Score</option>
          <option value="alphabetical">Alphabetical</option>
          <option value="suggester">Suggester Name</option>
          <option value="pages">Number of Pages</option>
          <option v-for="name in raters" :key="name" :value="`rating:${name}`">
            {{ name }}'s Rating
          </option>
        </select>
      </div>
      <div class="book-list read">
        <div v-for="book in readAndRated" :key="book.id" class="book-item">
          <img v-if="book.image" :src="book.image" alt="Book Cover" />
          <div v-else class="no-cover">No Cover Available</div>
          <div class="book-title">{{ book.title }}</div>
          <div v-if="book.pages" class="page-count">{{ book.pages }} pages</div>
          <div class="book-suggester">{{ book.suggester }}</div>
          <div v-if="book.finishedAt" class="book-finished">
            Finished {{ formatMonth(book.finishedAt) }}
          </div>
          <div class="average-rating">
            Average Rating: {{ calculateAverageRating(book) }}
          </div>
          <br>
          <div class="individual-ratings" v-if="book.showScores">
          <div v-for="rating in book.ratings" :key="rating.member">
            {{ rating.member }}: {{ rating.score === null ? "skipped" : rating.score }}
          </div>
        </div>
        <button @click="toggleScores(book)">Individual Scores</button>
        </div>
      </div>
    </div>

    <div v-if="isModalOpen" class="modal">
      <div class="modal-content">
        <h2>Rate Book</h2>
        <form @submit.prevent="rateBook(selectedBook, myRating)">
          <button type="button" class="close-button" @click="closeModal">&times;</button>
          <p class="modal-book">{{ selectedBook.title }}</p>
          <div class="rating-inputs">
            <label for="myRating">{{ session.member.name }}:</label>
            <input
              type="number"
              id="myRating"
              v-model="myRating"
              min="1"
              max="10"
              step="0.5"
              @change="validateRatingInput('myRating')"
              required
            />
          </div>
          <p class="hint">Scores stay hidden until everyone has rated.</p>
          <div v-if="error" class="error">{{ error }}</div>
          <button type="submit" :disabled="isSaving">Save rating</button>
          <button type="button" class="skip-button" :disabled="isSaving" @click="rateBook(selectedBook, null)">
            Skip, I didn't read it
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import api, { session, errorMessage } from "@/api";

export default {
  data() {
    return {
      session,
      waitingToBeRated: [],
      readAndRated: [],
      raters: [],
      isModalOpen: false,
      isSaving: false,
      selectedBook: null,
      myRating: "",
      error: "",
      sortOption: "default",
    };
  },
  methods: {

    validateRatingInput(ratingKey) {
    let rating = parseFloat(this[ratingKey]);

    if (!isNaN(rating)) {
      rating = Math.max(1, Math.min(10, rating));

      // Ratings go in steps of 0.5
      this[ratingKey] = Math.round(rating * 2) / 2;
    }
  },

    async rateBooks() {
      try {
        const { data } = await api.get("/books");
        this.waitingToBeRated = data.reading;
        this.readAndRated = data.rated.map((book) => ({ ...book, showScores: false }));
        this.raters = data.raters;
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
      this.myRating = book.myRating && !book.myRating.skipped ? book.myRating.score : "";
      this.error = "";
      this.isModalOpen = true;
    },

    closeModal() {
      this.isModalOpen = false;
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
      return book.average === null ? "No ratings available" : book.average.toFixed(1);
    },

    formatMonth(date) {
      return new Date(date).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    },

    memberRating(book, name) {
      const rating = book.ratings.find((r) => r.member === name);
      return rating ? rating.score : null;
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

        case "suggester":
          this.readAndRated.sort((a, b) =>
            (a.suggester || "").localeCompare(b.suggester || "")
          );
          break;

        default:
          if (this.sortOption.startsWith("rating:")) {
            const name = this.sortOption.slice("rating:".length);
            // Books the person did not rate go to the bottom
            this.readAndRated.sort((a, b) => (this.memberRating(b, name) ?? -1) - (this.memberRating(a, name) ?? -1));
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

label {
  margin-right: 8px;
  font-weight: bold;
}

select {
  padding: 8px;
  font-size: 14px;
}
.book-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center;
  z-index: 99;
}

.book-item {
  width: 200px;
  padding: 10px;
  border-radius: 8px;
  text-align: center;
  z-index: 99;
}

.book-title {
  margin-top: 10px;
  font-size: 14px;
}

.added-to-hat-message {
  position: relative;
  color: #0df40d;
  margin-top: 10px;
  z-index: 100;
}

button {
  font-family: "Quicksand", sans-serif;
  width: 200px;
  height: 50px;
  margin-top: 10px;
  background-color: #ffc90e;
  color: white;
  font-size: 16px;
  border: solid 1px #333;
  border-radius: 7px;
  cursor: pointer;
  z-index: 99;
}

.no-cover {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #ffffff;
  position: relative;
  z-index: 99;
}

form {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: "Quicksand", sans-serif;
}

input {
  width: 300px;
  height: 40px;
  margin: 10px 0;
  padding: 10px;
  font-size: 16px;
  box-shadow: 2px 2px 8px #959595;
  border: solid 1px;
  border-radius: 7px;
  font-family: "Quicksand", sans-serif;
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

.rating-status {
  font-size: 13px;
  margin-top: 6px;
  opacity: 0.9;
}

.book-finished {
  font-size: 13px;
  opacity: 0.8;
}

.modal-book {
  font-weight: bold;
  margin-top: 0;
}

.hint {
  font-size: 13px;
}

.error {
  color: #ff0000;
  margin-bottom: 6px;
}

.skip-button {
  background-color: transparent;
  height: 36px;
  font-size: 14px;
}

.individual-ratings {
  background-color: rgba(54, 54, 54, 0.521); 
  border: 1px solid #959595;
  border-radius: 8px;
  padding: 10px;
  margin-top: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s ease-in-out;
  max-width: 200px;
  margin: 0 auto;
}

.individual-ratings div {
  margin-bottom: 5px;
}

.search {
  visibility: hidden;
}


.searchAnimation {
  animation: searchAnimation 1s ease-in-out forwards;
  animation-delay: 0.7s;
}

@keyframes searchAnimation {
  0% {
    opacity: 0;
    transform: translateY(-20px) scale(1);
    visibility: visible;
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    visibility: visible;
  }
}

.no-books-waiting {
  color: #0df40d;
  position: relative;
  z-index: 99;
  animation: headingAnimation 1s ease-in-out forwards;
}

.modal {
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 110;
}

.close-button {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 36px;
  height: 36px;
  margin: 0;
  padding: 0;
  font-size: 28px;
  line-height: 1;
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: #333;
  text-shadow: none;
  z-index: 10;
}

.close-button:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.modal-content {
  position: relative;
  box-sizing: border-box;
  max-width: calc(100vw - 32px);
  background: #c8bfe7;
  padding: 20px;
  border-radius: 8px;
  z-index: 110;
}

@media (min-width: 780px) {
  .modal-content {
    max-width: 40%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  label {
  margin-right: 8px;
  font-weight: bold;
  margin-bottom: 5px; 
}

input {
  width: 90%; 
  height: 40px;
  margin: 5px 0; 
  padding: 10px;
  font-size: 16px;
  box-shadow: 2px 2px 8px #959595;
  border: solid 1px;
  border-radius: 7px;
  font-family: "Quicksand", sans-serif;
}
}

/* Media queries */
@media (max-width: 768px) {
  .book-item {
    width: 100%;
  }

}
</style>
