import ensResolverFor from "./ens"

const resolvers = {
  ensResolverFor,
}

type ResolverConstructors = ReturnType<typeof resolvers[keyof typeof resolvers]>

export type NameResolverSystem = ResolverConstructors["type"]

export { ensResolverFor }
