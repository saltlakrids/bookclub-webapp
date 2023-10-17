<template>
  <div>
    <h2 class="heading">Rate Book</h2>
    <p class="subHeading subHeadingAnimation">
     Rate the book you read
    </p>
    <form class="form formAnimation">
      <input v-model="title" type="text" placeholder="Book title" />
      <br />
      <input v-model="pages" type="number" placeholder="Number of pages" />
      <br />
      <input
        v-model="suggester"
        type="text"
        placeholder="Who suggested the book"
      />
      <br />
      <input v-model="rating" class="slider" type="range" min="1" max="10" id="rating" />
      <br />
      <button class="button buttonAnimation" @click.prevent="rateBook">
       Add rating
      </button>
    </form>
    <div class="error" v-if="error">{{ error }}</div>
    <div class="addText" v-if="added">
      <div class="text">Book rated!</div>
    </div>
  </div>
</template>

<script>
import { db } from "../firebase/init";
import "firebase/database";
import { doc, setDoc } from "firebase/firestore";
import { ref } from "vue";
const title = ref("");

export default {
  name: "rate-book",
  data() {
    return {
      title: "",
      pages: "",
      suggester: "",
      added: false,
      error: "",
    };
  },
  methods: {
    async rateBook() {
      if (!this.title || !this.pages || !this.suggester) {
        this.error = "Please fill out all fields.";
        return;
      }

      var id = "id" + Math.random().toString(20).slice(2);

      console.log(title);

      await setDoc(doc(db, "ratings", id), {
        title: this.title,
        pages: this.pages,
        suggester: this.suggester,
      });
      this.title = "";
      this.pages = "";
      this.suggester = "";
      this.added = true;
      this.error = "";
    },
  },
};
</script>

<style scoped>
form {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: "Quicksand", sans-serif;
}

.slider {
  box-shadow: none;
}

.error {
  color: #ff0000;
  margin-top: 10px;
  z-index: 99;
  position: relative;
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
  font-family: "Quicksand", sans-serif;
}

button {
  font-family: "Quicksand", sans-serif;
  width: 200px;
  height: 50px;
  margin-top: 10px;
  background-color: #ffc90e;
  color: white;
  font-size: 16px;
  border: solid 1px #333;
  border-radius: 7px;
  cursor: pointer;
}

button:hover {
  background-color: #ffc90e;
}


@keyframes slideDown {
  0% {
    top: 400px;
    opacity: 0;
  }
  25% {
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

.subHeading {
  visibility: hidden;
}

.subHeadingAnimation {
  animation: subHeadingAnimation 1s ease-in-out forwards;
  animation-delay: 0.7s;
}

@keyframes subHeadingAnimation {
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

.form {
  visibility: hidden;
}

.formAnimation {
  animation: formAnimation 1s ease-in-out forwards;
  animation-delay: 1.3s;
}

@keyframes formAnimation {
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

.button {
  visibility: hidden;
}

.buttonAnimation {
  animation: buttonAnimation 1s ease-in-out forwards;
  animation-delay: 1.7s;
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

</style>
