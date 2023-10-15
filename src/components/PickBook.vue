<template>
  <div class="container">
    <h2 class="heading">Pick Book</h2>
   
    <button class="button buttonAnimation" @click="pickRandomBook">Pick a book</button>
    <p class="totalBooks totalBooksAnimation">Total Books: {{ totalBooks }}</p>
    <!-- <button @click="deleteBook" v-if="book">Delete book</button> -->
    <div class="pickedBook">
      <div v-if="book" class="selected-book">
        <h3>Selected Book</h3>
        <br>
        <img v-if="book.image" :src="book.image" alt="Book Cover" />
          <div v-else class="no-cover">No Cover Available</div>
        <p><strong>Title:</strong> {{ book.title }}</p>
        <p><strong>Pages:</strong> {{ book.pages }}</p>
        <p><strong>Suggested by:</strong> {{ book.suggester }}</p>
      </div>
      <div v-else-if="isLoading" class="loading-message">
        Loading...
      </div>
      <div v-else-if="error" class="error-message">
        No books to pick from.
      </div>
      <div v-else class="no-books-message" v-show="showNoBooksMessage">
        No books to pick from.
      </div>
    </div>
    <img class="addHat hatAnimation" alt="The Hat" src="../assets/theHat.png" />

  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from '../firebase/init';



const books = ref ([]);
const totalBooks = ref(0);
let isAuthenticated = false; 
let booksv2 = [];


export default {

setup(){
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
    };
  },

  methods: {
    
    async pickRandomBook() {
  if (!isAuthenticated) {
    console.error('User is not authenticated.');
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

}
}

</script>

<style scoped>

button {
    font-family: 'Quicksand', sans-serif;
    width: 200px;
    height: 50px;
    margin-top: 10px;
    background-color: #FFC90E;
    color: white;
    font-size: 16px;
    border: solid 1px #333;
    border-radius: 7px;
    cursor: pointer;
  }

  button:hover {
    background-color: #FFC90E;
  }


.no-cover {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f5f5f5;
  color: #777;
}
.no-books-message {
  color: #ff0000;
  margin-top: 10px;
}
.loading-message,
.error-message {
  margin-top: 10px;
}

.pickedBook {
  color: #8a2be2;
  margin-top: 40px;
  text-align: center;
  
}
.selected-book {
  background-color: #f0f0f0;
  border-radius: 5px;
  padding: 10px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
  margin-bottom: 20px;
}

.selected-book h3 {
  color: #333;
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
  animation: hatAnimation 1s ease-in-out forwards;
  animation-delay: 1.5s;
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
