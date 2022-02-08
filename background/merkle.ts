/* eslint-disable */
const { MerkleTree } = require("merkletreejs")
const createKeccakHash = require("keccak")

const hashObject = (object: Record<string, unknown>) =>
  createKeccakHash("keccak256").update(JSON.stringify(object)).digest("hex")

// Define Test Data
const test1Data = {
  bar: "baz",
  val: 12345,
}

const test2Data = {
  foo: "bar",
  val: 56789,
}

const test3Data = {
  address: "0xav2e332d979f766w8a",
  token: "ETH",
}

const allTestData = [test1Data, test2Data, test3Data]

// These are the leaves for our "valid" merkle-tree.
const leaves = allTestData.map((testData) => hashObject(testData)).sort()

// Sort the hashes so that we don't take order into account when checking for data consistency
leaves.sort()

const originalTree = new MerkleTree(leaves)

originalTree.print()
// └─ fa782ee536bcbb8020d887840724ffdbbe9b223fc262c8f0eeee6890694a57af
//    ├─ 09f1178fb933f991a6225d4e366ba90e905594f4789bfbf94d048cac81e9587e
//    │  ├─ 3e1c856c2620c842afa26963924e44f4332426644e8838ef3ce1a2962ab9610a
//    │  └─ 9c28e5f19b7e0808a1d83fc1465ed5a1c35c8b84b8818062341d4b40c6b87625
//    └─ a942f72954eba6fb007f5ade8f11ce3ce52a001d75f5d743221a21a9f0e241ed
//       └─ a942f72954eba6fb007f5ade8f11ce3ce52a001d75f5d743221a21a9f0e241ed

// This is our "valid" root - we'll want to share this with whatever processes / contracts are checking
// for test data consistency
const root = originalTree.getHexRoot() // Returns "0xfa782ee536bcbb8020d887840724ffdbbe9b223fc262c8f0eeee6890694a57af"

const proof = originalTree.getProof(hashObject(test1Data))
// Returns  [
// '0x9c28e5f19b7e0808a1d83fc1465ed5a1c35c8b84b8818062341d4b40c6b87625', // The sister leaf
// '0xa942f72954eba6fb007f5ade8f11ce3ce52a001d75f5d743221a21a9f0e241ed' // The other node
//   ]

// Lets verify a leaf! (test1Data).  Since we're using the original proof here this returns true
console.log(originalTree.verify(proof, hashObject(test1Data), root)) // returns true

// OK - time to mix things up - lets our 3rd testData to something new.
const newTestData = {
  Daed: "alus",
}

// Sort the same way, hash the same way
const newLeaves = [test1Data, test2Data, newTestData]
  .map((data) => hashObject(data))
  .sort()

// Now - we create a new tree from the new test data
const newTree = new MerkleTree(newLeaves)

newTree.print()
// └─ 06c1782a8f44e05128b55efc394ae8e02873690c6f22eec3a6e45604af8d1131
//    ├─ 03bff998c4da696a2e52e652511e38eaadc3e4243dd72123eac0755a7b9953ac
//    │  ├─ 3e1c856c2620c842afa26963924e44f4332426644e8838ef3ce1a2962ab9610a <-- same hash as in 1st tree
//    │  └─ 6e95dd99a2bb71666fc46f3abfe2098dded692ca90bb0972fc0a89da842be398 <-- different hash
//    └─ a942f72954eba6fb007f5ade8f11ce3ce52a001d75f5d743221a21a9f0e241ed
//       └─ a942f72954eba6fb007f5ade8f11ce3ce52a001d75f5d743221a21a9f0e241ed <-- same hash as in 1st tree

// We get a new proof using a leaf that is in _both_ this tree and the original tree
const badProof = newTree.getProof(hashObject(test1Data))

// Even though the leaf is in both `newTree` and `originalTree` - we fail to verify because
// we can't reconstruct the root of `originalTree` given this leaf and the proof of `newTree`
console.log(newTree.verify(badProof, hashObject(test1Data), root)) // returns false
