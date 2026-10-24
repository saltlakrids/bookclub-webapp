<template>
  <div>
    <h2 class="heading">Add Book</h2>
    <div>
      <input class="search searchAnimation" v-model="searchQuery" @input="searchBooks" placeholder="Enter book title" />
      <div v-if="addedToHat" class="added-to-hat-message">“{{ addedToHat }}” is in the hat! 🎩</div>
      <div v-if="isSearching" class="searching-message">Searching...</div>
      <div v-else-if="noResults" class="searching-message">No books found, try other words.</div>
      <div v-if="error" class="error-message">{{ error }}</div>
      <div v-if="books.length" class="book-grid">
        <BookCard v-for="book in books" :key="book.id" ref="cards" :book="book">
          <template #meta>
            <div v-if="book.authors.length">{{ book.authors.join(", ") }}</div>
            <div v-if="book.pages">{{ book.pages }} pages</div>
          </template>
          <template #actions>
            <button @click="openModal(book)">Add to Hat</button>
          </template>
        </BookCard>
      </div>
    </div>
    <img ref="hat" class="addHat hatAnimation" alt="The Hat" src="../assets/theHat.png" />
  </div>

  <BookDialog :open="isModalOpen" title="Put it in the hat" :book="dialogBook" @close="closeModal">
    <form @submit.prevent="addToHat(selectedBook)">
      <label class="dialog-label" for="suggester">Who suggests it?</label>
      <div id="suggester" class="suggester-choices" role="radiogroup">
        <button
          v-for="name in session.members"
          :key="name"
          type="button"
          role="radio"
          :aria-checked="suggesterName === name"
          class="suggester-chip"
          :class="{ chosen: suggesterName === name }"
          @click="suggesterName = name"
        >
          {{ name }}
        </button>
      </div>
      <button type="button" class="secondary" @click="coverPickerOpen = true">
        {{ dialogBook && dialogBook.image ? "Choose another cover" : "Add a cover" }}
      </button>
      <button type="submit" class="primary" :disabled="!suggesterName || isSaving">Put it in the hat 🎩</button>
    </form>
  </BookDialog>

  <CoverPicker
    :open="coverPickerOpen"
    :book="dialogBook"
    choose-only
    @close="coverPickerOpen = false"
    @chosen="useCover"
  />
</template>

<script>
import api, { session, errorMessage } from "@/api";
import BookCard from "@/components/BookCard.vue";
import BookDialog from "@/components/BookDialog.vue";
import CoverPicker from "@/components/CoverPicker.vue";
import { flyIntoHat } from "@/hatAnimation";

export default {
  components: { BookCard, BookDialog, CoverPicker },
  data() {
    return {
      session,
      searchQuery: '',
      books: [],
      addedToHat: '',
      error: '',
      searchTimeout: null,
      isModalOpen: false,
      isSaving: false,
      isSearching: false,
      noResults: false,
      selectedBook: null,
      // A cover picked by hand, used instead of the one the search found
      chosenImage: '',
      coverPickerOpen: false,
      suggesterName: '',
    };
  },
  computed: {
    dialogBook() {
      if (!this.selectedBook) return null;
      return { ...this.selectedBook, image: this.chosenImage || this.selectedBook.image };
    },
  },
  methods: {
    searchBooks() {
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }

      this.searchTimeout = setTimeout(() => {
      const query = this.searchQuery.trim();
      this.books = [];
      this.addedToHat = '';
      this.error = '';
      this.noResults = false;
      this.isSearching = query.length > 2;

      if (query.length > 2) {
        api.get('/search', { params: { q: query } })
          .then(response => {
            // Ignore answers to an older search
            if (query !== this.searchQuery.trim()) {
              return;
            }
            this.isSearching = false;
            this.books = response.data;
            this.noResults = this.books.length === 0;

          // Books with a cover first, otherwise keep the search relevance order
          this.books.sort((a, b) => (b.image ? 1 : 0) - (a.image ? 1 : 0));
          })
          .catch(error => {
            if (query !== this.searchQuery.trim()) {
              return;
            }
            console.error('Error fetching books:', error);
            this.isSearching = false;
            this.error = errorMessage(error);
          });
      }
    }, 700);
  },
  openModal(book) {
    this.selectedBook = book;
    this.chosenImage = '';
    this.suggesterName = session.member ? session.member.name : '';
    this.isModalOpen = true;
  },
  closeModal() {
      this.isModalOpen = false;
    },

    useCover(url) {
      this.chosenImage = url;
      this.coverPickerOpen = false;
    },

    // The card's cover, which flies into the hat once the book is saved
    coverOf(book) {
      const card = (this.$refs.cards || []).find((c) => c.book === book);
      return card ? card.coverElement() : null;
    },

    async addToHat(book) {
      if (!book || !this.suggesterName || this.isSaving) {
        return;
      }

      this.isSaving = true;
      try {
        const image = this.chosenImage || book.image || null;
        await api.post('/books', {
          title: book.title,
          pages: book.pages || null,
          image,
          suggester: this.suggesterName,
        });
        this.closeModal();

        // Show the right cover on the card, then let it fly into the hat before the list clears
        book.image = image || '';
        await this.$nextTick();
        try {
          const cover = this.coverOf(book);
          const flight = flyIntoHat(cover, this.$refs.hat);
          if (cover) cover.style.visibility = 'hidden';
          await flight;
        } catch (error) {
          // The book is in the hat either way; the show is a bonus
          console.warn('Hat animation failed:', error);
        }

        this.addedToHat = book.title;
        this.searchQuery = '';
        this.books = [];
        this.suggesterName = '';
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
.searching-message {
  position: relative;
  margin: 10px 0;
  z-index: 100;
}

.error-message {
  position: relative;
  color: #ff7b7b;
  margin: 10px 0;
  z-index: 100;
}

.added-to-hat-message {
  position: relative;
  color: #0df40d;
  margin: 10px 0 16px;
  z-index: 100;
}

input.search {
    width: 300px;
    max-width: calc(100vw - 48px);
    height: 40px;
    margin: 10px 0 20px;
    padding: 10px;
    font-size: 16px;
    box-shadow: 2px 2px 8px #959595;
    border: solid 1px;
    border-radius: 7px;
    font-family: 'Quicksand', sans-serif;
    box-sizing: border-box;
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

.dialog-label {
  display: block;
  margin: 4px 0 8px;
  font-size: 14px;
  opacity: 0.85;
}

.suggester-choices {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.suggester-chip {
  width: auto;
  height: 38px;
  margin: 0;
  padding: 0 16px;
  font-family: 'Quicksand', sans-serif;
  font-size: 15px;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  cursor: pointer;
}

.suggester-chip.chosen {
  color: #1d1729;
  background: #ffc90e;
  border-color: #ffc90e;
  font-weight: bold;
}

.addHat {
  padding-top: 70px;
  width: 390px;
  max-width: 80vw;
  visibility: hidden;
  position: relative;
  z-index: 99;
}

.hatAnimation {
  animation: hatAnimation 1s ease-in-out forwards;
  animation-delay: 1.3s;
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
