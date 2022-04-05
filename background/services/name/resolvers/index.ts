import ensResolverFor from "./ens"
import unsResolver from "./uns"
import addressBookResolverFor from "./address-book"
import knownContractResolverFor from "./known-contracts"

const resolvers = {
  ensResolverFor,
  unsResolver,
  addressBookResolverFor,
  knownContractResolverFor,
}

type ResolverConstructors = ReturnType<typeof resolvers[keyof typeof resolvers]>

export type NameResolverSystem = ResolverConstructors["type"]

export {
  ensResolverFor,
  unsResolver,
  addressBookResolverFor,
  knownContractResolverFor,
}
