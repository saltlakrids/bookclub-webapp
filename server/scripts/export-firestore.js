// Dumps the old Firestore collections to JSON, for import-excel.js --firestore.
//
//   node server/scripts/export-firestore.js > firestore.json

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyCLvhC-fLxzqBZP6V8p0gCCXdNWK-lAok4",
  projectId: "book-club-f1df5",
  appId: "1:1057855146453:web:0738e2084c7ae5a643d55c",
});
const db = getFirestore(app);

const output = {};
for (const name of ["books", "ratings", "rated"]) {
  const snapshot = await getDocs(collection(db, name));
  output[name] = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
console.log(JSON.stringify(output, null, 2));
process.exit(0);
