// @ts-check
/* eslint-disable no-console */ // need logging
/* eslint-disable no-await-in-loop  */ // need to process items in sequence
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"
import { initializeApp } from "firebase/app"
import {
  getFirestore,
  query,
  orderBy,
  limit,
  getDocs,
  collection,
  startAfter,
  where,
} from "firebase/firestore"
import fetch from "node-fetch"

const { GALXE_ACCESS_TOKEN, FIRESTORE_USER, FIRESTORE_PASSWORD } = process.env

if (!GALXE_ACCESS_TOKEN || !FIRESTORE_USER || !FIRESTORE_PASSWORD) {
  console.error("Missing credentials")
  process.exit(1)
}

// Limit sync range to last 2 days (1 day from the last sync + 1 day margin)
const TARGET_DATE = new Date(Date.now() - 2 * 24 * 60 * 60_000)

const wait = (ms) =>
  new Promise((r) => {
    setTimeout(r, ms)
  })

const getAddresses = async () => {
  const app = initializeApp({
    apiKey: "AIzaSyAa78OwfLesUAW8hdzbhUkc5U8LSVH3y7s",
    authDomain: "tally-prd.firebaseapp.com",
    projectId: "tally-prd",
    storageBucket: "tally-prd.appspot.com",
    messagingSenderId: "567502050788",
    appId: "1:567502050788:web:bb953a931a98e396d363f1",
  })

  await signInWithEmailAndPassword(
    getAuth(app),
    FIRESTORE_USER,
    FIRESTORE_PASSWORD,
  )

  const db = getFirestore(app)
  const dbCollection = collection(db, "address")

  const CHUNK_SIZE = 5_000

  const fetchNextBatch = async (offset) => {
    let currentQuery = query(
      dbCollection,
      orderBy("signedManifesto.timestamp", "desc"),
      limit(CHUNK_SIZE),
      where("signedManifesto.timestamp", ">=", TARGET_DATE),
    )

    if (offset) {
      currentQuery = query(currentQuery, startAfter(offset))
    }

    return getDocs(currentQuery).then((snapshot) => snapshot.docs)
  }

  const allDocs = []

  let offsetDoc
  let nextBatch = []

  do {
    nextBatch = await fetchNextBatch(offsetDoc)

    offsetDoc = nextBatch[nextBatch.length - 1]

    allDocs.push(...nextBatch)

    console.log("Retrieved:", allDocs.length, "addresses")

    await wait(1500)
  } while (nextBatch.length === CHUNK_SIZE)

  return allDocs.map((doc) => doc.id)
}

const syncGalxe = async () => {
  const CHUNK_SIZE = 3_000

  const addresses = await getAddresses().catch(console.error)

  if (!addresses) {
    throw new Error("Unable to retrieve pledge signers addresses")
  }

  for (let i = 0; i < addresses.length; i += CHUNK_SIZE) {
    const batch = addresses.slice(i, i + CHUNK_SIZE)

    console.log("Syncing addresses...", batch.length, "of", addresses.length)

    const payload = {
      operationName: "credentialItems",
      query: `
      mutation credentialItems($credId: ID!, $operation: Operation!, $items: [String!]!) 
        { 
          credentialItems(input: { 
            credId: $credId 
            operation: $operation 
            items: $items 
          }) 
          { 
            name 
          } 
        }
      `,
      variables: {
        credId: "194531900883902464",
        operation: "APPEND",
        items: batch,
      },
    }

    try {
      await fetch("https://graphigo.prd.galaxy.eco/query", {
        headers: {
          "access-token": GALXE_ACCESS_TOKEN,
          "content-type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(payload),
      })
    } catch (error) {
      throw new Error("Unable to sync with galxe", { cause: error })
    }

    await wait(3000)
  }
}

syncGalxe().then(() => {
  console.log("Sync complete!")
  process.exit(0)
})
