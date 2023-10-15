<template>
  <div class="container">
    <h2 class="heading">Pick Book</h2>

    <button class="button buttonAnimation" @click="startBookPick">
      Pick a book
    </button>
    <div v-if="countdown > 0" class="countdown">{{ countdown }}</div>
    <div class="totalBooksContainer" @click="toggleTotalBooks">
      <p class="totalBooks totalBooksAnimation">
        Total Books: <span :class="{ blurred: isTotalBooksClicked }">{{ totalBooks }}</span>
      </p>
    </div>

    <!-- <button @click="deleteBook" v-if="book">Delete book</button> -->
    <div class="pickedBook">
      <div v-if="book" class="selected-book">
        <h3>Selected Book</h3>
        <br />
        <img v-if="book.image" :src="book.image" alt="Book Cover" />
        <div v-else class="no-cover">No Cover Available</div>
        <p><strong>Title:</strong> {{ book.title }}</p>
        <p><strong>Pages:</strong> {{ book.pages }}</p>
        <p><strong>Suggested by:</strong> {{ book.suggester }}</p>
      </div>
      <div v-else-if="isLoading" class="loading-message">Loading...</div>
      <div v-else-if="error" class="error-message">No books to pick from.</div>
      <div v-else class="no-books-message" v-show="showNoBooksMessage">
        No books to pick from.
      </div>
    </div>
    <img class="addHat hatAnimation" alt="The Hat" src="../assets/theHat.png" />
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
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

export default {
  setup() {
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
    });
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
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    async startBookPick() {
      this.countdown = 5; 

  
      for (let i = this.countdown; i > 0; i--) {
        await this.delay(1000);
        this.countdown = i;
      }

      this.countdown = 0;
      this.pickRandomBook();
    },

    async animateCountdown(seconds) {
      for (let i = seconds; i > 0; i--) {
        await this.delay(1000);
        console.log(`Countdown: ${i}`);
        this.countdown = i; 
      }
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
}

.totalBooksContainer {
  cursor: pointer; 
}

.totalBooks span.blurred {
  filter: blur(2.5px);
}

button:hover {
  background-color: #ffc90e;
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
