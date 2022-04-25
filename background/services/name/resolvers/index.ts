import ensResolverFor from "./ens"
import addressBookResolverFor from "./address-book"
import knownContractResolverFor from "./known-contracts"
import unsResolver from "./uns"

const resolvers = {
  ensResolverFor,
  addressBookResolverFor,
  knownContractResolverFor,
  unsResolver,
}

type ResolverConstructors = ReturnType<typeof resolvers[keyof typeof resolvers]>

export type NameResolverSystem = ResolverConstructors["type"]

export {
  ensResolverFor,
  addressBookResolverFor,
  knownContractResolverFor,
  unsResolver,
}
