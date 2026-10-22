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
            <button @click="openModal(book)">Rate</button>
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
          <option value="frederik">Frederik's Rating</option>
          <option value="chrisRating">Chris's Rating</option>
          <option value="oscarRating">Oscar's Rating</option>
          <option value="dumstreiRating">Dumstrei's Rating</option>
          <option value="evaRating">Eva's Rating</option>
          <option value="jensRating">Jens's Rating</option>
        </select>
      </div>
      <div class="book-list read">
        <div v-for="book in readAndRated" :key="book.id" class="book-item">
          <img v-if="book.image" :src="book.image" alt="Book Cover" />
          <div v-else class="no-cover">No Cover Available</div>
          <div class="book-title">{{ book.title }}</div>
          <div v-if="book.pages" class="page-count">{{ book.pages }} pages</div>
          <div class="book-suggester">{{ book.suggester }}</div>
          <div class="average-rating">
            Average Rating: {{ calculateAverageRating(book) }}
          </div>
          <br>
          <div class="individual-ratings" v-if="book.showScores">
          <div v-if="book.chrisRating">Chris: {{ book.chrisRating }}</div>
          <div v-if="book.frederikRating">Frederik: {{ book.frederikRating }}</div>
          <div v-if="book.oscarRating">Oscar: {{ book.oscarRating }}</div>
          <div v-if="book.dumstreiRating">Dumstrei: {{ book.dumstreiRating }}</div>
          <div v-if="book.jensRating">Jens: {{ book.jensRating }}</div>
          <div v-if="book.evaRating">Eva: {{ book.evaRating }}</div>
        </div>
        <button @click="toggleScores(book)">Individual Scores</button>
        </div>
      </div>
    </div>

    <div v-if="isModalOpen" class="modal">
      <div class="modal-content">
        <h2>Rate Book</h2>
        <form @submit.prevent="rateBook(selectedBook)">
          <button type="button" class="close-button" @click="closeModal">&times;</button>
          <div class="rating-inputs">
            <label for="chrisRating">Chris:</label>
            <input
              type="number"
              id="chrisRating"
              v-model="chrisRating"
              min="1"
              :max="10"
              step="0.5"
              @input="validateRatingInput('chrisRating')"  
              required
            />

            <label for="frederikRating">Frederik:</label>
            <input
              type="number"
              id="frederikRating"
              v-model="frederikRating"
              min="1"
              :max="10"
              step="0.5"
              @input="validateRatingInput('frederikRating')"
              required
            />

            <label for="oscarRating">Oscar:</label>
            <input
              type="number"
              id="oscarRating"
              v-model="oscarRating"
              min="1"
              :max="10"
              step="0.5"
              @input="validateRatingInput('oscarRating')"  
              required
            />

            <label for="dumstreiRating">Dumstrei:</label>
            <input
              type="number"
              id="dumstreiRating"
              v-model="dumstreiRating"
              min="1"
              :max="10"
              step="0.5"
              @input="validateRatingInput('dumstreiRating')"
              required
            />
          </div>
          <button type="submit" :disabled="isSaving">Save rating</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from "../firebase/init";
import {
  doc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
} from "firebase/firestore";

const RATING_KEYS = [
  "chrisRating",
  "frederikRating",
  "oscarRating",
  "jensRating",
  "dumstreiRating",
  "evaRating",
];

export default {
  data() {
    return {
      waitingToBeRated: [],
      readAndRated: [],
      isModalOpen: false,
      isSaving: false,
      selectedBook: null,
      chrisRating: "",
      frederikRating: "",
      oscarRating: "",
      dumstreiRating: "",
      sortOption: "default",
    };
  },
  methods: {

    validateRatingInput(ratingKey) {
    let rating = parseFloat(this[ratingKey]);

    if (!isNaN(rating)) {
      rating = Math.max(1, Math.min(10, rating));

      this[ratingKey] = parseFloat(rating.toFixed(1));
    }
  },

    async rateBooks() {
      try {
        const waitingSnapshot = await getDocs(collection(db, "ratings"));
        this.waitingToBeRated = waitingSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            pages: data.pages,
            suggester: data.suggester,
            image: data.image,
          };
        });

        const ratedSnapshot = await getDocs(collection(db, "rated"));
        this.readAndRated = ratedSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            pages: data.pages,
            suggester: data.suggester,
            image: data.image,
            chrisRating: data.chrisRating,
            frederikRating: data.frederikRating,
            oscarRating: data.oscarRating,
            jensRating: data.jensRating,
            dumstreiRating: data.dumstreiRating,
            evaRating: data.evaRating,
            timestamp: data.timestamp || 0,
            showScores: false,
          };
        });
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
      this.chrisRating = "";
      this.frederikRating = "";
      this.oscarRating = "";
      this.dumstreiRating = "";
      this.isModalOpen = true;
    },

    closeModal() {
      this.isModalOpen = false;
    },

    async rateBook(book) {
      if (!book || this.isSaving) {
        return;
      }

      const id = "id" + Math.random().toString(20).slice(2);
      const ratedBook = {
        title: book.title,
        pages: book.pages || null,
        suggester: book.suggester,
        image: book.image || "",
        chrisRating: this.chrisRating,
        frederikRating: this.frederikRating,
        oscarRating: this.oscarRating,
        dumstreiRating: this.dumstreiRating,
        timestamp: Date.now(),
      };

      this.isSaving = true;
      try {
        await setDoc(doc(db, "rated", id), ratedBook);
        await deleteDoc(doc(db, "ratings", book.id));

        this.waitingToBeRated = this.waitingToBeRated.filter(
          (b) => b.id !== book.id
        );
        this.readAndRated.unshift({ id, ...ratedBook, showScores: false });
        this.sortReadAndRatedBooks();

        this.closeModal();
      } catch (error) {
        console.error("Error rating the book:", error);
      } finally {
        this.isSaving = false;
      }
    },

    // Only counts people who actually rated (0, "" and missing mean no rating)
    averageRating(book) {
      const ratings = RATING_KEYS.map((key) => book[key]).filter(
        (rating) => typeof rating === "number" && rating > 0
      );

      if (ratings.length === 0) {
        return null;
      }

      return ratings.reduce((acc, rating) => acc + rating, 0) / ratings.length;
    },

    calculateAverageRating(book) {
      const average = this.averageRating(book);
      return average === null ? "No ratings available" : average.toFixed(1);
    },

    sortReadAndRatedBooks() {
      switch (this.sortOption) {
        case "default":
          this.readAndRated.sort((a, b) => b.timestamp - a.timestamp);
          break;

        case "highestScore":
          this.readAndRated.sort((a, b) => {
            return (this.averageRating(b) ?? -1) - (this.averageRating(a) ?? -1);
          });
          break;

        case "alphabetical":
          this.readAndRated.sort((a, b) => {
            return (a.title || "").localeCompare(b.title || "");
          });
          break;

        case "pages":
          this.sortByNumeric("pages");
          break;

        case "frederik":
          this.sortByNumeric("frederikRating");
          break;

        case "chrisRating":
        case "oscarRating":
        case "jensRating":
        case "dumstreiRating":
        case "evaRating":
          this.sortByNumeric(this.sortOption);
          break;

        case "suggester":
          this.readAndRated.sort((a, b) =>
            (a.suggester || "").localeCompare(b.suggester || "")
          );
          break;

        default:
          break;
      }
    },

    // Books missing the value go to the bottom
    sortByNumeric(property) {
      this.readAndRated.sort((a, b) => (Number(b[property]) || 0) - (Number(a[property]) || 0));
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

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 20px;
  background: none;
  border: none;
  cursor: pointer;
  color: #fff;
  z-index: 10;
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

.modal-content {
  position: relative;
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

  .close-button {
    position: absolute;
    top: 5px;
    right: -45px;
    font-size: 20px;
    background: none;
    border: none;
    cursor: pointer;
    color: #fff;
    z-index: 10;
  }
}
</style>
