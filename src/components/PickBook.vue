<template>
  <div class="container">
  <h1>Slow Guys Book Club</h1>
  <h2>Book selector</h2>
  <button @click="pickRandomBook">pick a book</button>
  <img class="addHat" alt="The Hat" src="../assets/theHat.png" />
  <div class="pickedBook">
  <p v-if="book" >Selected book: {{ book.title }} with {{ book.pages }} pages</p>
  <p v-else-if="isLoading">Loading...</p>
  <p v-else-if="error">{{ error }}</p>
</div>
</div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { collection, getDocs } from "firebase/firestore";
import { db } from '../firebase/init';


// //  books
const books = ref ([

]
)

let booksv2 = [];


// get books


export default {

setup(){
  onMounted(async () => {
const querySnapshot = await getDocs(collection(db, "books"));
let fbBooks = []
querySnapshot.forEach((doc) => {
  console.log(doc.id, " => ", doc.data());
  const book = {
    id: doc.id,
    title: doc.data().title,
    pages: doc.data().pages,
    suggester: doc.data().suggester,
  }
  fbBooks.push(book)
  booksv2.push(book);
})
books.value = fbBooks
})
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
      if(!db){
        console.error("Firestore not initialized");
        return;
   }
        this.isLoading = true;
        try {
            // const booksRef = db.collection('books');
            // const querySnapshot = await booksRef.get();
            // const numBooks = querySnapshot.size;
            // if(numBooks === 0){
            //     throw new Error("No books found")
            // }
            // Generate a random index

            const size = booksv2.length;

            const randomIndex = Math.floor(Math.random() * size);

            // Get the book at the random index
            const selectedBook = booksv2[randomIndex];

            // Update the selected book title
            this.book = selectedBook;
             //Remove the book from the database
            await selectedBook.ref.delete();

            const newArray = [];

            booksv2.forEach(function(elem,i) {

              if(i !== randomIndex) {
                newArray.push(elem)
              }
            });

            booksv2 = newArray;
            
        } catch (error) {
            this.error = error.message;
        } finally {
            this.isLoading = false;
        }
    }
}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
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
