declare const OpaqueTagSymbol: unique symbol
declare class OpaqueTag<S extends symbol> {
  readonly [OpaqueTagSymbol]: S
}

export type Opaque<T, S extends symbol> = T & OpaqueTag<S>

export type UnwrapOpaque<OpaqueType extends OpaqueTag<symbol>> =
  OpaqueType extends Opaque<infer Type, OpaqueType[typeof OpaqueTagSymbol]>
    ? Type
    : OpaqueType
