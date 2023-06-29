// @ts-check
/* eslint-disable no-console */ // need logging
/* eslint-disable no-await-in-loop  */ // need to process items in sequence
import admin from "firebase-admin"
import fetch from "node-fetch"

/* eslint-disable prefer-destructuring */
const GALXE_ACCESS_TOKEN = process.env.GALXE_ACCESS_TOKEN
const FIRESTORE_AUTH = process.env.FIRESTORE_AUTH

if (!GALXE_ACCESS_TOKEN || !FIRESTORE_AUTH) {
  console.error("Missing credentials")
  process.exit(1)
}

// Limit sync range to last 4 days ( 2 days from last sync + 2 days from now )
const TARGET_DATE = new Date(Date.now() - 4 * 24 * 60 * 60_000)

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const getAddresses = async () => {
  const app = admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(FIRESTORE_AUTH)),
  })

  const db = app.firestore()
  const collection = db.collection("address")

  const CHUNK_SIZE = 5_000

  const getDocs = async (offset) => {
    let query = collection
      .orderBy("signedManifesto.timestamp", "desc")
      .limit(CHUNK_SIZE)
      .where("signedManifesto.timestamp", ">=", TARGET_DATE)

    if (offset) {
      query = query.startAfter(offset)
    }

    return query.get().then((snapshot) => snapshot.docs)
  }

  const allDocs = []

  let offsetDoc
  let nextBatch = []

  do {
    nextBatch = await getDocs(offsetDoc)

    offsetDoc = nextBatch[nextBatch.length - 1]

    allDocs.push(...nextBatch)

    console.log("Retrieved:", allDocs.length, "addresses")

    await wait(1500)
  } while (nextBatch.length === CHUNK_SIZE)

  return allDocs.map((doc) => doc.id)
}

const syncGalxe = async () => {
  const CHUNK_SIZE = 3_000

  const addresses = await getAddresses().catch(() => null)

  if (!addresses) {
    throw new Error("Unable to retrieve pledge signers addresses")
  }

  for (let i = 0; i < addresses.length; i += CHUNK_SIZE) {
    const batch = addresses.slice(i, i + CHUNK_SIZE)

    console.log("Syncing addresses...", i, "of", addresses.length)

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
      throw new Error("Unable to sync with galxe")
    }

    await wait(3000)
  }
}

syncGalxe()
