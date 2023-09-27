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
        // User will be redirected to Google Sign-In and back to your app
      } catch (error) {
        console.error('Google Sign-In Error:', error);
      }
    },
  },
};
</script>
