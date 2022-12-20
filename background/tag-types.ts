declare const OpaqueTagSymbol: unique symbol
declare class OpaqueTag<S extends symbol> {
  private [OpaqueTagSymbol]: S
}

export type Opaque<T, S extends symbol> = T & OpaqueTag<S>
