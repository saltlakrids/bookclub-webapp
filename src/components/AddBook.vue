<template>
  <div>
    <h2>Book suggester</h2>
    <form>
      <input v-model="title" type="text" placeholder="Book title" />
      <br />
      <input v-model="pages" type="number" placeholder="Number of pages" />
      <br />
      <input v-model="suggester" type="text" placeholder="Who suggested the book" />
      <br />
      <button @click.prevent="addBook">Add to the hat</button>
    </form>
    <div class="addText" v-if="added">
      <div class="text">Book added!</div>
    </div>
    <img class="addHat" alt="The Hat" src="../assets/theHat.png" />
  </div>
</template>

<script>

import { db } from '../firebase/init';
import 'firebase/database';
import { doc, setDoc } from "firebase/firestore"; 
import { ref } from 'vue'
const title = ref('')

export default {
  name: "add-book",
  data() {
    return {
      title: "",
      pages: "",
      suggester: "",
      added: false
    };
  },
  methods: {
    async addBook() {

      var id = "id" + Math.random().toString(20).slice(2)

      console.log(title)

      await setDoc(doc(db, "books", id), {
        title: this.title,
        pages: this.pages,
        suggester: this.suggester
      });
      this.title = "";
      this.pages = "";
      this.suggester = "";
      this.added = true;

    }
  }
};
</script>


<style>
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
  
  button {
    font-family: 'Quicksand', sans-serif;
    width: 200px;
    height: 50px;
    margin-top: 10px;
    background-color: lightblue;
    color: white;
    font-size: 16px;
    border: solid 1px;
    border-radius: 7px;
    cursor: pointer;
  }

  button:hover {
    background-color: rgb(88, 204, 243);
  }

  .text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  }
  .addText {
    background-image: url('@/assets/theBook.png');
    background-size: cover;
    background-repeat: no-repeat;
    position: absolute;
    left: 50%;
    width: 120px;
    height: 160px;
    transform: translateX(-50%);
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 18px;
    animation: slideDown 3s 1 ease-out forwards;
  }

  @keyframes slideDown {
    0% {
      top: 400px;
      opacity: 0;
    }
    25%{
      opacity: 1;
    }
    50% {
      opacity: 1;
    }
    80% {
      opacity: 0;
    }
    100% {
      top: 700px;
      opacity: 0;
    }
  }


  .addHat {

    padding-top: 140px;
    width: 390px;
  }
</style>