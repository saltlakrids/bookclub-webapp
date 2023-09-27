<template>
  <button @click="signInWithGoogle">Sign In with Google</button>
</template>

<script>
import { getAuth, GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';

export default {
  methods: {
    async signInWithGoogle() {
      try {
        const auth = getAuth();
        const provider = new GoogleAuthProvider();
        await signInWithRedirect(auth, provider);
      } catch (error) {
        console.error('Google Sign-In Error:', error);
      }
    },
  },
};
</script>
