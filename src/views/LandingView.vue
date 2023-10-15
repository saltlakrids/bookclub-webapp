<template>
  <div>
    <div class="heading intro">
      <svg>
        <text x="50%" y="50%" dy=".35em" text-anchor="middle">
          Slow Guys Book Club
        </text>
      </svg>
    </div>
    <h3 class="subheading subheadingAnimation">
      Welcome to the Webapp that helps you decide what book to read next!
    </h3>
    <h4 class="body bodyAnimation">
      Add your favorite books to the magic hat or let fate choose your next
      literary adventure. Embrace the magic of the hat and pick your next great
      book!
    </h4>
    <img
      class="addHat hatAnimation"
      alt="The Hat"
      src="../assets/theHat.png"
      @click="navigateToPickBook"
    />
  </div>
</template>
<script>
export default {

  methods: {
    navigateToPickBook() {
      this.$router.push({ name: 'pick' });
    },
  },
};

</script>

<style scoped>
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

@import url("https://fonts.googleapis.com/css2?family=Lato&display=swap");

svg {
  font-family: "Quicksand", sans-serif;
  width: 100%;
  height: 100%;
}
svg text {
  animation: stroke 3s 1 alternate;
  stroke-width: 2;
  stroke: #d01a71;
  font-size: 35px;
}
@keyframes stroke {
  2% {
    fill: rgba(138, 43, 226, 0);
    stroke: rgba(208, 26, 113, 1);
    stroke-dashoffset: 25%;
    stroke-dasharray: 0 50%;
    stroke-width: 2;
  }
  70% {
    fill: rgba(138, 43, 226, 0);
    stroke: rgba(208, 26, 113, 1);
  }
  80% {
    fill: rgba(138, 43, 226, 0);
    stroke: rgba(208, 26, 113, 1);
    stroke-width: 3;
  }
  100% {
    fill: rgba(138, 43, 226, 0);
    stroke: rgba(208, 26, 113, 1);
    stroke-dashoffset: -25%;
    stroke-dasharray: 50% 0;
    stroke-width: 2;
    visibility: visible;
  }
}

.heading {
  margin-top: -30px;
  margin-bottom: -45px;
  position: relative;
}

.intro {
  z-index: 99;
}

.subheading {
  visibility: hidden;
  font-family: "Quicksand", sans-serif;
}

.body {
  visibility: hidden;
  font-family: "Quicksand", sans-serif;
  margin: 15px;
}

.subheadingAnimation {
  animation: subheadingAnimation 1s cubic-bezier(0.68, -0.55, 0.27, 1.55)
    forwards;
  animation-delay: 2.5s;
}

.bodyAnimation {
  animation: bodyAnimation 1s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards;
  animation-delay: 3.5s;
}

@keyframes subheadingAnimation {
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

@keyframes bodyAnimation {
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
  padding-top: 40px;
  width: 390px;
  visibility: hidden;
}

.hatAnimation {
  animation: hatAnimation 1s ease-in-out forwards, wobble 1.5s infinite;
  animation-delay: 4.5s;
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
