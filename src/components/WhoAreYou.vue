<template>
  <div class="who">
    <img class="addHat" alt="The Hat" src="../assets/theHat.png" />
    <div class="who-content">
      <template v-if="!session.login">
        <h2>Who goes there?</h2>
        <p>{{ session.error || "Open the book club through Tailscale to sign in." }}</p>
      </template>
      <template v-else-if="session.unclaimed.length">
        <h2>Who are you?</h2>
        <p>The hat needs to know who is rating. You only pick this once.</p>
        <form @submit.prevent="claim">
          <select class="name-list" v-model="name" required>
            <option disabled value="">Select a name</option>
            <option v-for="member in session.unclaimed" :key="member" :value="member">
              {{ member }}
            </option>
          </select>
          <button type="submit" :disabled="isSaving">That's me</button>
        </form>
      </template>
      <template v-else>
        <h2>The hat does not know you</h2>
        <p>All members are taken. Ask Frederik to let you in.</p>
      </template>
      <div v-if="error" class="error">{{ error }}</div>
      <p v-if="session.login" class="login">Tailscale: {{ session.login }}</p>
    </div>
  </div>
</template>

<script>
import { session, claimMember, errorMessage, loadSession } from "@/api";

export default {
  data() {
    return {
      session,
      name: "",
      error: "",
      isSaving: false,
    };
  },
  methods: {
    async claim() {
      this.isSaving = true;
      this.error = "";
      try {
        await claimMember(this.name);
      } catch (error) {
        this.error = errorMessage(error);
        await loadSession();
      } finally {
        this.isSaving = false;
      }
    },
  },
};
</script>

<style scoped>
.who {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.who-content {
  position: relative;
  z-index: 99;
  background: #c8bfe7;
  padding: 20px;
  border-radius: 8px;
  max-width: 320px;
  margin: 0 16px;
  animation: enterAnimation 1s ease-in-out forwards;
}

form {
  display: flex;
  flex-direction: column;
  align-items: center;
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
  font-family: "Quicksand", sans-serif;
}

.error {
  color: #ff0000;
  margin-top: 10px;
}

.login {
  font-size: 12px;
  opacity: 0.8;
}

.addHat {
  width: 260px;
  position: relative;
  z-index: 99;
  animation: wobble 1.5s infinite;
}

@keyframes enterAnimation {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
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
