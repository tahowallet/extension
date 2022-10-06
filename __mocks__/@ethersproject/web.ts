const mock =
  jest.createMockFromModule<typeof import("@ethersproject/web")>(
    "@ethersproject/web"
  )

const actual =
  jest.requireActual<typeof import("@ethersproject/web")>("@ethersproject/web")

const fetchJson: typeof actual["fetchJson"] = async (connection) => {
  const url = typeof connection === "string" ? connection : connection.url

  return fetch(url).then((res) => res.json())
}

module.exports = { ...mock, ...actual, fetchJson }
