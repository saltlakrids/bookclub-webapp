<template>
  <div class="container">
    <h1>Slow Guys Book Club</h1>
    <h2>Book selector</h2>
    <button @click="pickRandomBook">Pick a book</button>
    <!-- <button @click="deleteBook" v-if="book">Delete book</button> -->
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

// async deleteBook() {
//   if (!isAuthenticated) {
//     console.error('User is not authenticated.');
//     return;
//   }

//   console.log("Delete book function called");
//   if (!db) {
//     console.error("Firestore not initialized");
//     return;
//   }

//   this.isLoading = true;
//   try {
//     if (confirm("Are you sure?")) {
//       const selectedBook = this.book; 
//       console.log("Selected book:", selectedBook);

//       if (selectedBook && selectedBook.ref) {
//         console.log("Selected book reference:", selectedBook.ref);

       
//         await deleteDoc(doc(db, "books", selectedBook.id));
        
//         console.log("Book deleted");
//         this.book = null; 
        
//         const indexToDelete = booksv2.indexOf(selectedBook.id);
//         if (indexToDelete !== -1) {
//           booksv2.splice(indexToDelete, 1);
//         }
//       } else {
//         console.error("Selected book or its reference is undefined.");
//       }
//     }
//   } catch (error) {
//     console.error("Error deleting book:", error);
//     this.error = error.message;
//   } finally {
//     this.isLoading = false;
//   }
// }

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
