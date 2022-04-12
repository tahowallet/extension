import ensResolverFor from "./ens"
import addressBookResolverFor from "./address-book"
import knownContractResolverFor from "./known-contracts"

const resolvers = {
  ensResolverFor,
  addressBookResolverFor,
  knownContractResolverFor,
}

type ResolverConstructors = ReturnType<typeof resolvers[keyof typeof resolvers]>

export type NameResolverSystem = ResolverConstructors["type"]

export { ensResolverFor, addressBookResolverFor, knownContractResolverFor }
