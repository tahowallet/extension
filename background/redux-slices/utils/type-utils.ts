/**
 * Given a container and a key in that container, returns that key only
 * if it is of the DesiredType; otherwise produces `never`. Used for
 * filtering a container's properties by type, see `PickPropertiesOfType`.
 */
type PickType<
  Container,
  ContainerProperty extends keyof Container,
  DesiredType
> = Container[ContainerProperty] extends DesiredType ? ContainerProperty : never

/**
 * Produces a type consisting only of the properties in the specified Container
 * that have type DesiredType.
 */
export type PickPropertiesOfType<Container, DesiredType> = {
  [Property in keyof Container as PickType<
    Container,
    Property,
    DesiredType
  >]: Container[Property]
}

/**
 * Products the union of keys of the given Container whose type have
 * DesiredType.
 */
export type PropertiesOfType<Container, DesiredType> =
  keyof PickPropertiesOfType<Container, DesiredType>
