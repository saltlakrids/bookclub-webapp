<template>
  <div class="container">
    <h1>Slow Guys Book Club</h1>
    <h2>Book selector</h2>
    <button @click="pickRandomBook">Pick a book</button>
    <button @click="deleteBook" v-if="book">Delete book</button>
    <div class="pickedBook">
      <p v-if="book">Selected book: {{ book.title }} with {{ book.pages }} pages, suggested by:{{ book.suggester }}</p>
      <p v-else-if="isLoading">Loading...</p>
      <p v-else-if="error">{{ error }}</p>
    </div>
    <img class="addHat" alt="The Hat" src="../assets/theHat.png" />

  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from '../firebase/init';


// //  books
const books = ref ([]);
let isAuthenticated = false; 

let booksv2 = [];


// get books


export default {

setup(){
     // Listen for changes in the authentication state
     const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      isAuthenticated = !!user; // Set isAuthenticated to true if a user is signed in
    });
  onMounted(async () => {
  const querySnapshot = await getDocs(collection(db, "books"));
  let fbBooks = [];
  querySnapshot.forEach((doc) => {
    console.log(doc.id, " => ", doc.data());
    const book = {
      id: doc.id, // Store the document ID
      title: doc.data().title,
      pages: doc.data().pages,
      suggester: doc.data().suggester,
    };
    fbBooks.push(book);
    booksv2.push(doc.id); // Store the document ID in booksv2
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
    const selectedBookId = booksv2[randomIndex]; // Get the stored document ID
    const selectedBookRef = doc(collection(db, "books"), selectedBookId); // Create the document reference
    // Get the book data using the reference
    const bookSnapshot = await getDoc(selectedBookRef);
    const selectedBook = {
      id: bookSnapshot.id,
      title: bookSnapshot.data().title,
      pages: bookSnapshot.data().pages,
      suggester: bookSnapshot.data().suggester,
      ref: selectedBookRef, // Store the reference
    };
    console.log("Selected book reference:", selectedBook.ref);

    // Update the selected book title
    this.book = selectedBook;
    // Remove the book from the database
    // Remove the book ID from your local array
    booksv2.splice(randomIndex, 1);
  } catch (error) {
    this.error = error.message;
  } finally {
    this.isLoading = false;
  }
},

async deleteBook() {
  if (!isAuthenticated) {
    console.error('User is not authenticated.');
    return;
  }

  console.log("Delete book function called");
  if (!db) {
    console.error("Firestore not initialized");
    return;
  }

  this.isLoading = true;
  try {
    if (confirm("Are you sure?")) {
      const selectedBook = this.book; // Get the currently selected book
      console.log("Selected book:", selectedBook);

      if (selectedBook && selectedBook.ref) {
        console.log("Selected book reference:", selectedBook.ref);

        // Use deleteDoc to delete the document
        await deleteDoc(doc(db, "books", selectedBook.id));
        
        console.log("Book deleted");
        this.book = null; // Clear the selected book
        // You can also remove the deleted book ID from the local array if needed
        const indexToDelete = booksv2.indexOf(selectedBook.id);
        if (indexToDelete !== -1) {
          booksv2.splice(indexToDelete, 1);
        }
      } else {
        console.error("Selected book or its reference is undefined.");
      }
    }
  } catch (error) {
    console.error("Error deleting book:", error);
    this.error = error.message;
  } finally {
    this.isLoading = false;
  }
}

}
}

</script>

<style scoped>

.pickedBook {
  color: blueviolet;
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
