<template>
  <div class="container">
    <h1>Slow Guys Book Club</h1>
    <h2>Book selector</h2>
    <button @click="pickRandomBook">Pick a book</button>
    <!-- <button @click="deleteBook" v-if="book">Delete book</button> -->
    <div class="pickedBook">
      <div v-if="book" class="selected-book">
        <h3>Selected Book</h3>
        <p><strong>Title:</strong> {{ book.title }}</p>
        <p><strong>Pages:</strong> {{ book.pages }}</p>
        <p><strong>Suggested by:</strong> {{ book.suggester }}</p>
      </div>
    </div>
    <img class="addHat" alt="The Hat" src="../assets/theHat.png" />

  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from '../firebase/init';



const books = ref ([]);
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
    };
    fbBooks.push(book);
    booksv2.push(doc.id);
  });
  books.value = fbBooks;
});
},
 
  data() {
    return {
 book: "",
 isLoading: false,
 error: null
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
},

}
}

</script>

<style scoped>

.pickedBook {
  color: blueviolet;
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
</style>
