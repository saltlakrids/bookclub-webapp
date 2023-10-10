<template>
    <div>
    <h1>Slow Guys Book Club</h1>
    <h3>Welcome to the Webapp that helps you decide what book to read next!</h3>
    <p>Add your favorite books to the magic hat or let fate choose your next literary adventure. Embrace the magic of the hat and discover your next great read!</p>
    <img class="addHat" alt="The Hat" src="../assets/theHat.png" />
    </div>
</template>
<script>


</script>

<style scoped>
.addHat {
animation: wobble 1.5s infinite;
padding-top: 200px;
width: 390px;
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


</style>