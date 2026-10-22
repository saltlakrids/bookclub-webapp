<template>
  <div>
    <h2 class="heading">Add Book</h2>
    <div>
      <input class="search searchAnimation" v-model="searchQuery" @input="searchBooks" placeholder="Enter book title" />
      <div class="book-list">
        <div v-for="book in books" :key="book.id" class="book-item">
          <img v-if="book.image" :src="book.image" alt="Book Cover" />
          <div v-else class="no-cover">No Cover Available</div>
          <div class="book-title">{{ book.title }}</div>
          <div v-if="book.authors.length" class="book-authors">{{ book.authors.join(", ") }}</div>
          <div v-if="book.pages" class="page-count">{{ book.pages }} pages</div>
          <button @click="openModal(book)">Add to Hat</button>
        </div>
      </div>
      <div v-if="addedToHat" class="added-to-hat-message">
        Book added to the hat!
      </div>
      <div v-if="error" class="error-message">{{ error }}</div>
    </div>
    <img class="addHat hatAnimation" alt="The Hat" src="../assets/theHat.png" />
  </div>
  <div v-if="isModalOpen" class="modal">
      <div class="modal-content">
        <h2>Suggester name</h2>
        <form @submit.prevent="addToHat(selectedBook)">
          <button type="button" class="close-button" @click="closeModal">&times;</button>
          <select class="name-list" v-model="suggesterName" required>
            <option disabled value="">Select a name</option>
            <option v-for="name in session.members" :key="name" :value="name">
              {{ name }}
            </option>
          </select>
          <button type="submit" :disabled="isSaving">Save</button>
        </form>
      </div>
    </div>
</template>

<script>
import api, { session, errorMessage } from "@/api";


export default {
  data() {
    return {
      session,
      searchQuery: '',
      books: [],
      addedToHat: false,
      error: '',
      searchTimeout: null,
      isModalOpen: false,
      isSaving: false,
      selectedBook: null,
      suggesterName: '',
    };
  },
  methods: {

    searchBooks() {

      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      
      this.searchTimeout = setTimeout(() => {
      const query = this.searchQuery.trim();
      
      this.books = []; 
      this.addedToHat = false;
      this.error = '';
      
      if (query.length > 2) {
        api.get('/search', { params: { q: query } })
          .then(response => {
            // Ignore answers to an older search
            if (query !== this.searchQuery.trim()) {
              return;
            }
            this.books = response.data;
        
          // Books with a cover first, otherwise keep the search relevance order
          this.books.sort((a, b) => (b.image ? 1 : 0) - (a.image ? 1 : 0));
          })

          .catch(error => {
            console.error('Error fetching books:', error);
            this.error = errorMessage(error);
          });
      }
    }, 500);
  },

  
  openModal(book) {
    this.selectedBook = book;
    this.suggesterName = session.member ? session.member.name : '';
    this.isModalOpen = true;
  },

  closeModal() {
      this.isModalOpen = false;
    },

    async addToHat(book) {
      if (!book || !this.suggesterName || this.isSaving) {
        return;
      }

      this.isSaving = true;
      try {
        await api.post('/books', {
          title: book.title,
          pages: book.pages || null,
          image: book.image || null,
          suggester: this.suggesterName,
        });
        this.addedToHat = true;
        this.searchQuery = '';
        this.books = [];
        this.suggesterName = '';
        this.closeModal();
      } catch (error) {
        console.error('Error adding book to the hat:', error);
        this.error = errorMessage(error);
        this.closeModal();
      } finally {
        this.isSaving = false;
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

.book-authors {
  font-size: 12px;
  opacity: 0.8;
}

.error-message {
  position: relative;
  color: #ff0000;
  margin-top: 10px;
  z-index: 100;
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

.close-button {
  position: absolute;
  top: 32%;
  left: 51%;
  font-size: 20px;
  background: none;
  border: none;
  cursor: pointer;
  color: #fff; 
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
  background: #C8BFE7;
  padding: 20px;
  border-radius: 8px;
  z-index: 110;
}



/* Media queries */
@media (max-width: 768px) {
  .book-item {
    width: 100%; 
  }
  .close-button {
  position: absolute;
  top: 35%;
  left: 50%;
  font-size: 20px;
  background: none;
  border: none;
  cursor: pointer;
  color: #fff; 
}
  
}

@media (max-width: 375px) {
  .close-button {
  position: absolute;
  top: 32%;
  left: 53%;
  font-size: 20px;
  background: none;
  border: none;
  cursor: pointer;
  color: #fff; 
}
}

.name-list {
    color: #333;
    width: 220px;
    height: 30px;
    margin: 10px 0;
    font-size: 14px;
    box-shadow: 2px 2px 8px #959595;
    border: solid 1px;
    border-radius: 7px;
    font-family: 'Quicksand', sans-serif;
  }


.addHat {
  padding-top: 70px;
  width: 390px;
  visibility: hidden;
}



.hatAnimation {
  animation: hatAnimation 1s ease-in-out forwards;
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