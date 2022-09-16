// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AsyncifyFn<K> = K extends (...args: any[]) => any
  ? (...args: Parameters<K>) => Promise<ReturnType<K>>
  : never
