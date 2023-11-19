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
        </div>
      </div>
    </div>

    <div v-if="isModalOpen" class="modal">
      <div class="modal-content">
        <h2>Rate Book</h2>
        <form @submit.prevent="closeModalAndAddToHat">
          <button class="close-button" @click="closeModal">&times;</button>
          <div class="rating-inputs">
            <label for="chrisRating">Chris:</label>
            <input
              type="number"
              id="chrisRating"
              v-model="chrisRating"
              min="1"
              max="10"
              required
            />

            <label for="frederikRating">Frederik:</label>
            <input
              type="number"
              id="frederikRating"
              v-model="frederikRating"
              min="1"
              max="10"
              required
            />

            <label for="oscarRating">Oscar:</label>
            <input
              type="number"
              id="oscarRating"
              v-model="oscarRating"
              min="1"
              max="10"
              required
            />

            <label for="dumstreiRating">Dumstrei:</label>
            <input
              type="number"
              id="dumstreiRating"
              v-model="dumstreiRating"
              min="1"
              max="10"
              required
            />

            <label for="jensRating">Jens:</label>
            <input
              type="number"
              id="jensRating"
              v-model="jensRating"
              min="1"
              max="10"
            />

            <label for="evaRating">Eva:</label>
            <input
              type="number"
              id="evaRating"
              v-model="evaRating"
              min="1"
              max="10"
            />
          </div>
          <button @click="rateBook(selectedBook)">Save rating</button>
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

export default {
  data() {
    return {
      waitingToBeRated: [],
      readAndRated: [],
      isModalOpen: false,
      chrisRating: 1,
      frederikRating: 1,
      oscarRating: 1,
      jensRating: 1,
      dumstreiRating: 1,
      evaRating: 1,
      sortOption: "default",
    };
  },
  methods: {
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
            chrisRating: data.chrisRating,
            frederikRating: data.frederikRating,
            oscarRating: data.oscarRating,
            jensRating: data.jensRating,
            dumstreiRating: data.dumstreiRating,
            evaRating: data.evaRating,
            timestamp: data.timestamp,
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
          };
        });
      } catch (error) {
        console.error("Error fetching books:", error);
      }
    },

    openModal(book) {
      this.selectedBook = book;
      this.isModalOpen = true;
    },

    closeModalAndAddToHat() {
      this.isModalOpen = false;
    },

    async rateBook(book) {
      if (book) {
        const id = "id" + Math.random().toString(20).slice(2);
        const thumbnail = book.image ? book.image : "";

        await setDoc(doc(db, "rated", id), {
          title: book.title,
          pages: book.pages || null,
          suggester: book.suggester,
          image: thumbnail,
          chrisRating: this.chrisRating,
          frederikRating: this.frederikRating,
          oscarRating: this.oscarRating,
          jensRating: this.jensRating,
          dumstreiRating: this.dumstreiRating,
          evaRating: this.evaRating,
          timestamp: Date.now(),
        })
          .then(() => {
            console.log("Book rated");

            const ratingsDocRef = doc(db, "ratings", book.id);
            deleteDoc(ratingsDocRef)
              .then(() => {
                console.log("Book removed from ratings");
              })
              .catch((error) => {
                console.error("Error removing book from ratings:", error);
              });

            const index = this.waitingToBeRated.findIndex(
              (b) => b.id === book.id
            );
            if (index !== -1) {
              this.waitingToBeRated.splice(index, 1);
            }

            this.readAndRated.unshift({
              id: id,
              title: book.title,
              pages: book.pages || null,
              suggester: book.suggester,
              image: thumbnail,
            });

            this.chrisRating = "";
            this.frederikRating = "";
            this.oscarRating = "";
            this.jensRating = "";
            this.dumstreiRating = "";
            this.evaRating = "";

            this.closeModalAndAddToHat();
          })
          .catch((error) => {
            console.error("Error rating the book:", error);
          });
        await this.rateBooks();
      } else {
        console.error("Suggester name is required.");
      }
    },

    calculateAverageRating(book) {
      const ratings = [
        book.chrisRating,
        book.frederikRating,
        book.oscarRating,
        book.jensRating,
        book.dumstreiRating,
        book.evaRating,
      ];

      const validRatings = ratings.filter(
        (rating) => typeof rating === "number" && !isNaN(rating)
      );

      if (validRatings.length === 0) {
        return "No ratings available";
      }

      const sum = ratings.reduce((acc, rating) => acc + rating, 0);
      const average = sum / ratings.length;

      return average.toFixed(1);
    },
    sortReadAndRatedBooks() {
      switch (this.sortOption) {
        case "default":
          break;

        case "highestScore":
          this.readAndRated.sort((a, b) => {
            const averageA = this.calculateAverageRating(a);
            const averageB = this.calculateAverageRating(b);
            return averageB - averageA;
          });
          break;

        case "alphabetical":
          this.readAndRated.sort((a, b) => {
            return a.title.localeCompare(b.title);
          });
          break;

        case "pages":
          this.sortByNumeric("pages");
          break;

        case "frederik":
          this.sortByRating("frederikRating");
          break;

        case "chrisRating":
          this.sortByRating("chrisRating");
          break;

        case "oscarRating":
          this.sortByRating("oscarRating");
          break;

        case "jensRating":
          this.sortByRating("jensRating");
          break;

        case "dumstreiRating":
          this.sortByRating("dumstreiRating");
          break;

        case "evaRating":
          this.sortByRating("evaRating");
          break;

        case "suggester":
          this.readAndRated.sort((a, b) =>
            a.suggester.localeCompare(b.suggester)
          );
          break;

        default:
          break;
      }
    },

    sortByRating(ratingKey) {
      this.readAndRated.sort((a, b) => {
        return b[ratingKey] - a[ratingKey];
      });
    },

    sortByNumeric(property) {
      this.readAndRated.sort((a, b) => b[property] - a[property]);
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
