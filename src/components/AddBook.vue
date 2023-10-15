<template>
  <div>
    <h2 class="heading">Add Book</h2>
    <p class="subHeading subHeadingAnimation">
      Recommended to try search book first
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
      <button class="button buttonAnimation" @click.prevent="addBook">
        Add to the hat
      </button>
    </form>
    <div class="error" v-if="error">{{ error }}</div>
    <div class="addText" v-if="added">
      <div class="text">Book added!</div>
    </div>
    <img class="addHat hatAnimation" alt="The Hat" src="../assets/theHat.png" />
  </div>
</template>

<script>
import { db } from "../firebase/init";
import "firebase/database";
import { doc, setDoc } from "firebase/firestore";
import { ref } from "vue";
const title = ref("");

export default {
  name: "add-book",
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
    async addBook() {
      if (!this.title || !this.pages || !this.suggester) {
        this.error = "Please fill out all fields.";
        return;
      }

      var id = "id" + Math.random().toString(20).slice(2);

      console.log(title);

      await setDoc(doc(db, "books", id), {
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

.text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.addText {
  background-image: url("@/assets/theBook.png");
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

.addHat {
  padding-top: 70px;
  width: 390px;
  visibility: hidden;
}

.hatAnimation {
  animation: hatAnimation 1s ease-in-out forwards;
  animation-delay: 2.4s;
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
