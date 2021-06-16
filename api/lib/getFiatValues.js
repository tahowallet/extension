import fetch from 'node-fetch'




export default async function getFiatValue (curencySym = 'usd', tokenId = 'ethereum') {
  const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=${curencySym}`)
  const data = await response.json()
  return parseFloat(data[tokenId][curencySym])
}

