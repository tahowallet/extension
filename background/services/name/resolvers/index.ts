import ensResolverFor from "./ens"
import addressBookResolverFor from "./address-book"
import knownContractResolverFor from "./known-contracts"
import unsResolver from "./uns"
import rnsResolver from "./rns"

const resolvers = {
  ensResolverFor,
  addressBookResolverFor,
  knownContractResolverFor,
  unsResolver,
  rnsResolver,
}

type ResolverConstructors = ReturnType<typeof resolvers[keyof typeof resolvers]>

export type NameResolverSystem = ResolverConstructors["type"]

export {
  ensResolverFor,
  addressBookResolverFor,
  knownContractResolverFor,
  unsResolver,
  rnsResolver,
}
