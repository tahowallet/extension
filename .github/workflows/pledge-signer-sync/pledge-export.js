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
import fs from "fs"

const { FIRESTORE_USER, FIRESTORE_PASSWORD } = process.env

if (!FIRESTORE_USER || !FIRESTORE_PASSWORD) {
  console.error("Missing credentials")
  process.exit(1)
}

// Limit sync range to last X days (here: 30 days)
const TARGET_DATE = new Date(Date.now() - 30 * 24 * 60 * 60_000)
const CHUNK_SIZE = 10_000

const wait = (ms) =>
  new Promise((r) => {
    setTimeout(r, ms)
  })

const saveSnapshot = async (addresses, index) => {
  if (!addresses) {
    throw new Error("Unable to retrieve pledge signers addresses")
  }

  console.log(
    `Saving snapshot of ${addresses.length} addresses to ./exports/pledge-export-${index}.json`,
  )

  const jsonContent = {
    score: addresses.map((address) => ({ address, score: 1 })),
  }

  try {
    fs.writeFileSync(
      `./exports/pledge-export-${index}.json`,
      JSON.stringify(jsonContent),
    )
    console.log("Snapshot saved!\n")
  } catch (err) {
    console.error(err)
  }
}

const exportSnapshot = async () => {
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

  const fetchNextBatch = async (offset) => {
    let currentQuery = query(
      dbCollection,
      orderBy("signedManifesto.timestamp", "desc"),
      limit(CHUNK_SIZE),
      where("signedManifesto.timestamp", ">=", TARGET_DATE), // Comment this line to export all addresses
    )

    if (offset) {
      currentQuery = query(currentQuery, startAfter(offset))
    }

    return getDocs(currentQuery).then((snapshot) => snapshot.docs)
  }

  let allDocsCount = 0
  let exportIndex = 0

  let offsetDoc
  let nextBatch = []

  do {
    nextBatch = await fetchNextBatch(offsetDoc)

    offsetDoc = nextBatch[nextBatch.length - 1]

    allDocsCount += nextBatch.length

    console.log("Retrieved:", allDocsCount, "addresses")

    await saveSnapshot(
      nextBatch.map((doc) => doc.id),
      exportIndex,
    )

    exportIndex += 1

    await wait(1500)
  } while (nextBatch.length === CHUNK_SIZE)
}

exportSnapshot().then(() => {
  console.log("Export complete!")
  process.exit(0)
})
