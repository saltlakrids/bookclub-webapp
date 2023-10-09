<template>
  <div>
    <h2>Search Books</h2>
    <div>
      <input v-model="searchQuery" @input="searchBooks" placeholder="Enter book title" />
      <div class="book-list">
        <div v-for="book in books" :key="book.id" class="book-item">
          <img v-if="book.volumeInfo.imageLinks" :src="book.volumeInfo.imageLinks.smallThumbnail" alt="Book Cover" />
          <div v-else class="no-cover">No Cover Available</div>
          <div class="book-title">{{ book.volumeInfo.title }}</div>
          <div v-if="book.volumeInfo.pageCount" class="page-count">{{ book.volumeInfo.pageCount }} pages</div>
          <button @click="addToHat(book)">Add to Hat</button>
        </div>
      </div>
      <div v-if="addedToHat" class="added-to-hat-message">
        Book added to the hat!
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '../firebase/init';
import { doc, setDoc } from "firebase/firestore"; 


export default {
  data() {
    return {
      searchQuery: '',
      books: [],
      addedToHat: false,
    };
  },
  methods: {
    searchBooks() {
      
      const apiKey = process.env.VUE_APP_GOOGLE_BOOKS_API_KEY;
      const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${this.searchQuery}&key=${apiKey}`;
      
      this.books = []; 
      
      if (this.searchQuery.length > 2) {
        this.$axios.get(apiUrl)
          .then(response => {
            this.books = response.data.items || [];
          })
          .catch(error => {
            console.error('Error fetching books:', error);
          });
      }
    },
    addToHat(book) {

      const suggesterName = window.prompt('Enter your first name:');

      if (suggesterName) {
      const id = "id" + Math.random().toString(20).slice(2);

      setDoc(doc(db, "books", id), {
        title: book.volumeInfo.title,
        pages: book.volumeInfo.pageCount || null,
        suggester: suggesterName,
        image: book.volumeInfo.imageLinks.smallThumbnail,
      })
      .then(() => {
        console.log('Book added to the hat!');
        this.addedToHat = true;
        this.searchQuery = '';
        this.books = []; 
      })
      .catch(error => {
        console.error('Error adding book to the hat:', error);
      });
    }
    },
  },
};
</script>

<style scoped>
.book-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center; 
}

.book-item {
  width: 200px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.book-title {
  margin-top: 10px;
  font-size: 14px;
}

.added-to-hat-message {
  color: green;
  margin-top: 10px;
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

/* Media queries */
@media (max-width: 768px) {
  .book-item {
    width: 100%; 
  }
}
</style>