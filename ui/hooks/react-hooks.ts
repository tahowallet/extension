import { useRef, useEffect } from "react"

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
  callback: Fn
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
