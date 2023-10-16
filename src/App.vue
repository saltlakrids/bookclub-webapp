<template>
  <nav class="navAnimation">
    <router-link to="/pick">Pick Book</router-link> |
    <router-link to="/search">Search Book</router-link> |
    <router-link to="/add">Add Book</router-link> |
    <router-link to="/rate">Rate Book</router-link>  
  </nav>
  <router-view/>
</template>

<style>

body, html {
  
  margin: 0;
  padding: 0;
  min-height: 100vh;
}


body {
  position: relative;
  background-image: url('/src/assets/background.jpeg');
  background-repeat: no-repeat;
  background-size: cover;
}

body::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
}

.intro {
  z-index: 99;
}

.pickedBook {
  color: #8a2be2;
  margin-top: 40px;
  text-align: center;
  
}

.no-cover {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #8a2be2;
  position: relative;
  z-index: 99;
}


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

.heading {
  z-index: 99;
  position: relative;
}

.pickedBook {
  color: #ffffff;
  margin-top: 40px;
  text-align: center;
  z-index: 99;
}

.selected-book {
  border-radius: 5px;
  padding: 10px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
  margin-bottom: 20px;
  z-index: 99;
}

.added-to-hat-message {
  position: relative;
  color: #0df40d;
  margin-top: 10px;
  z-index: 100;
}



#app {
  font-family: 'Quicksand', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #ffffff;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
}

nav {
  position: relative;
  padding: 30px;
  visibility: hidden;
  z-index: 2;
}

nav a {
  font-weight: bold;
  color: #ffffff;
  text-decoration: none;
  z-index: 2;
  position: relative;
}

nav a.router-link-exact-active {
  color: #FFC90E;
  text-decoration: none;
  z-index: 2;
  position: relative;
}

.navAnimation {
  animation: bounceInFromTop 5.5s linear both;
  visibility: visible;
  z-index: 2;
  position: relative;
}


button {
    font-family: 'Quicksand', sans-serif;
    width: 200px;
    height: 50px;
    margin-top: 10px;
    background-color: #FFC90E;
    color: white;
    font-size: 16px;
    border: solid 1px;
    border-radius: 7px;
    cursor: pointer;
  }

  button:hover {
    background-color: #FFC90E;
  }

@keyframes bounceInFromTop {
  0% {
    transform: translateY(-800px) rotate(-720deg);
    filter: blur(50px);
    opacity: 0;
  }
  100% {
    transform: translateY(0) rotate(0deg);
    filter: blur(0);
    opacity: 1;
  }
}

/* @keyframes wave {
  0% {
    opacity: 0;
  }
  10% {
    opacity: 0;
    text-shadow: none;
  }
  10.1% {
    opacity: 1;
    text-shadow: none;
    
  }
  10.2% {
    opacity: 0;
    text-shadow: none;
  }
  20% {
    opacity: 0;
    text-shadow: none;
  }
  20.1% {
    opacity: 1;
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.25);
  }
  20.6% {
    opacity: 0;
    text-shadow: none;
  }
  30% {
    opacity: 0;
    text-shadow: none;
  }
  30.1% {
    opacity: 1;
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.45), 0 0 60px rgba(255, 255, 255, 0.25);
  }
  30.5% {
    opacity: 1;
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.45), 0 0 60px rgba(255, 255, 255, 0.25);
  }
  30.6% {
    opacity: 0;
    text-shadow: none;
  }
  45% {
    opacity: 0;
    text-shadow: none;
  }
  45.1% {
    opacity: 1;
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.45), 0 0 60px rgba(255, 255, 255, 0.25);
  }
  50% {
    opacity: 1;
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.45), 0 0 60px rgba(255, 255, 255, 0.25);
  }
  55% {
    opacity: 1;
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.45), 0 0 60px rgba(255, 255, 255, 0.25);
  }
  55.1% {
    opacity: 0;
    text-shadow: none;
  }
  57% {
    opacity: 0;
    text-shadow: none;
  }
  57.1% {
    opacity: 1;
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.55), 0 0 60px rgba(255, 255, 255, 0.35);
  }
  60% {
    opacity: 1;
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.55), 0 0 60px rgba(255, 255, 255, 0.35);
  }
  60.1% {
    opacity: 0;
    text-shadow: none;
  }
  65% {
    opacity: 0;
    text-shadow: none;
  }
  65.1% {
    opacity: 1;
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.55), 0 0 60px rgba(255, 255, 255, 0.35), 0 0 100px rgba(255, 255, 255, 0.1);
  }
  75% {
    opacity: 1;
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.55), 0 0 60px rgba(255, 255, 255, 0.35), 0 0 100px rgba(255, 255, 255, 0.1);
  }
  75.1% {
    opacity: 0;
    text-shadow: none;
  }
  77% {
    opacity: 0;
    text-shadow: none;
  }
  77.1% {
    opacity: 1;
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.55), 0 0 60px rgba(255, 255, 255, 0.4), 0 0 110px rgba(255, 255, 255, 0.2), 0 0 100px rgba(255, 255, 255, 0.1);
  }
  85% {
    opacity: 1;
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.55), 0 0 60px rgba(255, 255, 255, 0.4), 0 0 110px rgba(255, 255, 255, 0.2), 0 0 100px rgba(255, 255, 255, 0.1);
  }
  85.1% {
    opacity: 0;
    text-shadow: none;
  }
  86% {
    opacity: 0;
    text-shadow: none;
  }
  86.1% {
    opacity: 1;
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.6), 0 0 60px rgba(255, 255, 255, 0.45), 0 0 110px rgba(255, 255, 255, 0.25), 0 0 100px rgba(255, 255, 255, 0.1);
  }
  100% {
    opacity: 1;
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.6), 0 0 60px rgba(255, 255, 255, 0.45), 0 0 110px rgba(255, 255, 255, 0.25), 0 0 100px rgba(255, 255, 255, 0.1);
  }
} */

</style>


