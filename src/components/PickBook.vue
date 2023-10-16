<template>
  <div>
    <div ref="fireworksContainer" class="fireworks-container"></div>
    <div class="container">
      <h2 class="heading">Pick Book</h2>
      <button class="button buttonAnimation" @click="startBookPick">
        Pick a book
      </button>
      <audio ref="drumRollAudio" src="drum-roll-2.mp3"></audio>
      <audio ref="trompetAudio" src="trompets.mp3"></audio>
      <div class="totalBooksContainer" @click="toggleTotalBooks">
        <p class="totalBooks totalBooksAnimation">
          Total Books:
          <span :class="{ blurred: isTotalBooksClicked }">{{
            totalBooks
          }}</span>
        </p>
      </div>
      <div
        v-if="countdown > 0"
        class="countdown"
        :class="{ 'countdown-animation': countdownAnimation }"
      >
        {{ countdown }}
      </div>
      <!-- <button @click="deleteBook" v-if="book">Delete book</button> -->
      <div class="pickedBook">
        <transition name="fade">
          <div v-if="book" class="selected-book">
            <h3>Selected Book</h3>
            <br />
            <img v-if="book.image" :src="book.image" alt="Book Cover" />
            <div v-else class="no-cover">No Cover Available</div>
            <p><strong>Title:</strong> {{ book.title }}</p>
            <p><strong>Pages:</strong> {{ book.pages }}</p>
            <p><strong>Suggested by:</strong> {{ book.suggester }}</p>
          </div>
        </transition>

        <div v-if="showCatGif && !isLoading && !error && !showNoBooksMessage" class="cat-trompet-container">
        <img src="cat-trompet.gif" alt="CatTrompetGIF" />
      </div>

        <div v-else-if="isLoading" class="loading-message">Loading...</div>

        <div v-else-if="error" class="error-message">
          No books to pick from.
        </div>

        <div v-else class="no-books-message" v-show="showNoBooksMessage">
          No books to pick from.
        </div>
      </div>
      <img
        class="addHat hatAnimation"
        alt="The Hat"
        src="../assets/theHat.png"
      />
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from "vue";
import { Fireworks } from "fireworks-js";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase/init";

const books = ref([]);
const totalBooks = ref(0);
const isTotalBooksClicked = ref(true);
let isAuthenticated = false;
let booksv2 = [];
const fireworks = ref(null);

export default {
  setup() {
    const fireworksContainer = ref(null);
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      isAuthenticated = !!user;
    });
    onMounted(async () => {
      const querySnapshot = await getDocs(collection(db, "books"));
      let fbBooks = [];
      querySnapshot.forEach((doc) => {
        console.log(doc.id, " => ", doc.data());
        const book = {
          id: doc.id,
          title: doc.data().title,
          pages: doc.data().pages,
          suggester: doc.data().suggester,
          image: doc.data().image,
        };
        fbBooks.push(book);
        booksv2.push(doc.id);
      });
      books.value = fbBooks;
      totalBooks.value = fbBooks.length;

      fireworks.value = new Fireworks(fireworksContainer.value, {
        autoresize: true,
        opacity: 0.5,
        acceleration: 1.05,
        friction: 0.97,
        gravity: 1.5,
        particles: 50,
        traceLength: 3,
        traceSpeed: 10,
        explosion: 5,
        intensity: 30,
        flickering: 50,
        lineStyle: "round",
        hue: {
          min: 0,
          max: 360,
        },
        delay: {
          min: 30,
          max: 60,
        },
        rocketsPoint: {
          min: 50,
          max: 50,
        },
        lineWidth: {
          explosion: {
            min: 1,
            max: 3,
          },
          trace: {
            min: 1,
            max: 2,
          },
        },
        brightness: {
          min: 50,
          max: 80,
        },
        decay: {
          min: 0.015,
          max: 0.03,
        },
        mouse: {
          click: false,
          move: false,
          max: 1,
        },
        sound: {
          enabled: true,
          files: ["explosion0.mp3", "explosion1.mp3", "explosion2.mp3"],
          volume: { min: 11, max: 12 },
        },
        targetCanvas: fireworksContainer.value.querySelector("canvas"),
      });
    });

    onUnmounted(() => {
      fireworks.value.stop();
    });
    return { fireworksContainer };
  },

  data() {
    return {
      book: "",
      isLoading: false,
      error: null,
      showNoBooksMessage: false,
      totalBooks,
      isTotalBooksClicked,
      countdown: 0,
    };
  },

  methods: {
    delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    async startBookPick() {
      if (booksv2.length === 0) {
        console.error("No books to pick from.");
        this.showNoBooksMessage = true;
        return;
      }
      this.countdown = 5;

      setTimeout(() => {
        this.$refs.drumRollAudio.play();
      }, 1500);

      for (let i = this.countdown; i > 0; i--) {
        await this.delay(1000);
        this.countdown = i;
      }

      await this.delay(1000);

      this.countdown = 0;
      if (this.$refs.trompetAudio) {
        this.$refs.trompetAudio.play();
        this.showCatGif = true;
      } else {
        console.error("trompetAudio ref not found.");
      }
      await this.delay(2000);
      this.showCatGif = false;
      this.pickRandomBook();
      fireworks.value.start();
    },

    async pickRandomBook() {
      if (!isAuthenticated) {
        console.error("User is not authenticated.");
        return;
      }

      if (!db) {
        console.error("Firestore not initialized");
        return;
      }

      this.isLoading = true;
      try {
        const size = booksv2.length;
        if (size === 0) {
          console.error("No books to pick from.");
          this.showNoBooksMessage = true;
          return;
        }
        const randomIndex = Math.floor(Math.random() * size);
        const selectedBookId = booksv2[randomIndex];
        const selectedBookRef = doc(collection(db, "books"), selectedBookId);

        const bookSnapshot = await getDoc(selectedBookRef);
        const selectedBook = {
          id: bookSnapshot.id,
          title: bookSnapshot.data().title,
          pages: bookSnapshot.data().pages,
          suggester: bookSnapshot.data().suggester,
          image: bookSnapshot.data().image,
          ref: selectedBookRef,
        };
        console.log("Selected book reference:", selectedBook.ref);

        this.book = selectedBook;

        await deleteDoc(selectedBookRef);

        booksv2.splice(randomIndex, 1);

        console.log("Book deleted");
      } catch (error) {
        this.error = error.message;
      } finally {
        this.isLoading = false;
      }
      totalBooks.value = booksv2.length;
    },
    toggleTotalBooks() {
      this.isTotalBooksClicked = !this.isTotalBooksClicked;
    },
  },
};
</script>

<style scoped>
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
  z-index: 2;
}

.totalBooksContainer {
  cursor: pointer;
  z-index: 2;
}

.fireworks-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  z-index: 0;
}

.totalBooks span.blurred {
  filter: blur(2.5px);
}

button:hover {
  background-color: #ffc90e;
}

.countdown {
  color: #ffc90e;
  position: relative;
  z-index: 99;
  font-size: 120px;
  animation: countdownAnimation 1s infinite;
}

@keyframes countdownAnimation {
  0%,
  100% {
    transform: scale(0.6);
  }
  20% {
    transform: scale(1.3);
  }
  40% {
    transform: scale(1.3);
  }
  60% {
    transform: scale(1.3);
  }
  80% {
    transform: scale(1.3);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}

.no-cover {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #fff;
  position: relative;
  z-index: 99;
}

.no-books-message {
  color: #ff0000;
  margin-top: 10px;
}
.loading-message,
.error-message {
  margin-top: 10px;
}

.selected-book {
  border-radius: 5px;
  padding: 10px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
  margin-bottom: 20px;
  z-index: 2;
}

.selected-book h3 {
  color: #fff;
  margin-top: 0;
}

.selected-book p {
  margin: 5px 0;
}

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
}
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}

.heading {
  animation: enterAnimation 1s ease-in-out forwards;
}

.button {
  visibility: hidden;
  animation: enterAnimation 1s ease-in-out forwards;
}

.buttonAnimation {
  animation: buttonAnimation 1.1s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards;
  animation-delay: 0.5s;
}

@keyframes buttonAnimation {
  0% {
    opacity: 0;
    transform: translateY(-20px);
    visibility: visible;
  }
  100% {
    opacity: 1;
    transform: translateY(0);
    visibility: visible;
  }
}

@keyframes enterAnimation {
  0% {
    opacity: 0;
    transform: translateY(-20px);
    visibility: visible;
  }
  100% {
    opacity: 1;
    transform: translateY(0);
    visibility: visible;
  }
}

.addHat {
  padding-top: 40px;
  width: 390px;
  visibility: hidden;
}

.hatAnimation {
  animation: hatAnimation 1s ease-in-out forwards, wobble 1.5s infinite forwards;
  animation-delay: 1.5s;
}

@keyframes wobble {
  0%,
  100% {
    transform: translateX(0%);
    transform-origin: 50% 50%;
  }
  15% {
    transform: translateX(-30px) rotate(6deg);
  }
  30% {
    transform: translateX(15px) rotate(-6deg);
  }
  45% {
    transform: translateX(-15px) rotate(3.6deg);
  }
  60% {
    transform: translateX(9px) rotate(-2.4deg);
  }
  75% {
    transform: translateX(-6px) rotate(1.2deg);
  }
}

@keyframes hatAnimation {
  0% {
    opacity: 0;
    transform: translateY(-20px);
    visibility: visible;
  }
  100% {
    opacity: 1;
    transform: translateY(0);
    visibility: visible;
  }
}

.totalBooks {
  visibility: hidden;
}

.totalBooksAnimation {
  animation: totalBooksAnimation 1s ease-in-out forwards;
  animation-delay: 1s;
}

@keyframes totalBooksAnimation {
  0% {
    opacity: 0;
    transform: translateY(-20px);
    visibility: visible;
  }
  100% {
    opacity: 1;
    transform: translateY(0);
    visibility: visible;
  }
}
</style>
