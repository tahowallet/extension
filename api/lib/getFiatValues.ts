import fetch from 'node-fetch'

export default async function getFiatValue(currencySymbol : string = 'usd', tokenId : string = 'ethereum') : Promise<number> {
  const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=${currencySymbol}`)
  const data = response.json()
  // TODO further validate response
  return parseFloat(data[tokenId][currencySymbol])
}
