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
