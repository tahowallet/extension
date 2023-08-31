import { useRef, useEffect, useState, useCallback } from "react"

/**
 * Useful when checking if a component is still mounted after an asynchronous
 * operation ends to prevent memory leaks
 */
export function useIsMounted(): React.MutableRefObject<boolean> {
  const mountedRef = useRef(false)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  return mountedRef
}

/**
 * Proper implementation of `setInterval` with cleanup on component unmount
 */
export function useInterval<F extends (...args: unknown[]) => unknown>(
  callback: F,
  delay: number,
): void {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const timerId = setInterval(() => callbackRef.current(), delay)

    return () => {
      clearInterval(timerId)
    }
  }, [delay])
}

/**
 * Returns an always updated ref to value
 */
export function useValueRef<T>(value: T): React.MutableRefObject<T> {
  const valueRef = useRef<T>(value)
  valueRef.current = value
  return valueRef
}

/**
 * Runs a callback on mount, if the callback returns a function,
 * it will be called on unmount
 */
export function useOnMount<Fn extends (...args: unknown[]) => unknown>(
  callback: Fn,
): void {
  const callbackRef = useRef(callback)

  useEffect(() => {
    const result = callbackRef.current()

    return () => {
      if (typeof result === "function") {
        result()
      }
    }
  }, [])
}

/**
 * Returns a value lagging by one render, starts
 * with the initially passed value
 */
export function usePrevious<T>(value: T): T {
  const valueRef = useRef(value)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  return valueRef.current
}

/**
 * Useful for "batching" state changes, Similar API to the old Component.setState
 */
export function useSetState<S extends Record<string, unknown>>(
  state: S,
): readonly [S, typeof setter] {
  const [value, setValue] = useState<S>(state)

  const setter = useCallback(
    <K extends keyof S>(
      newValue: ((prev: Readonly<S>) => S) | (Pick<S, K> | S),
    ) =>
      setValue((prevState) => {
        if (typeof newValue === "function") {
          return newValue(prevState)
        }

        return { ...prevState, ...newValue }
      }),
    [],
  )

  return [value, setter] as const
}

export function useRunOnFirstRender(func: () => void): void {
  const isFirst = useRef(true)

  if (isFirst.current) {
    isFirst.current = false
    func()
  }
}

export function useSkipFirstRenderEffect(
  func: () => void,
  deps: unknown[] = [],
): void {
  const didMount = useRef(false)

  useEffect(() => {
    if (didMount.current) func()
    else didMount.current = true
    // We are passing in the dependencies when we initialize this hook, so we can not know what it will be exactly and it's ok.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
