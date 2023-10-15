<template>
  <div>
    <h2 class="heading">Search Book</h2>
    <div>
      <input class="search searchAnimation" v-model="searchQuery" @input="searchBooks" placeholder="Enter book title" />
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
    <img class="addHat hatAnimation" alt="The Hat" src="../assets/theHat.png" />
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

       const thumbnail = book.volumeInfo.imageLinks
       ? book.volumeInfo.imageLinks.smallThumbnail
       : '';

      setDoc(doc(db, "books", id), {
        title: book.volumeInfo.title,
        pages: book.volumeInfo.pageCount || null,
        suggester: suggesterName,
        image: thumbnail,
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
    font-family: 'Quicksand', sans-serif;
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
    font-family: 'Quicksand', sans-serif;
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

.search{
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

/* Media queries */
@media (max-width: 768px) {
  .book-item {
    width: 100%; 
  }
}

.addHat {
  padding-top: 70px;
  width: 390px;
  visibility: hidden;
}

.hatAnimation {
  animation: hatAnimation 1s ease-in-out forwards, wobble 1.5s infinite forwards;
  animation-delay: 1.3s;
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
</style>