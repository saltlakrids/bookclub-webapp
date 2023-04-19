<template>
  <nav>
    <router-link to="/">Pick Book</router-link> |
    <router-link to="/AddBookView">Add Book</router-link>
  </nav>
  <router-view/>
</template>

<style>
#app {
  font-family: 'Quicksand', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

nav {
  padding: 30px;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
  text-decoration: none;
}

nav a.router-link-exact-active {
  color: rgb(88, 204, 243);
  text-decoration: none;
}
</style>
