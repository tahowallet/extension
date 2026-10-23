export default class IntersectionObserverMock {
  callbackMap: Map<HTMLElement, (..._: unknown[]) => void> = new Map()

  constructor(
    protected callback: (entry: [Partial<IntersectionObserverEntry>]) => void,
  ) {}

  observe(element: HTMLElement): void {
    const observerCallback = () =>
      this.callback([{ isIntersecting: true, target: element }])

    this.callbackMap.set(element, observerCallback)
    element.addEventListener("custom_intersect", observerCallback)

    // Intersect immediately
    observerCallback()
  }

  unobserve(element: HTMLElement): void {
    this.callbackMap.delete(element)
  }
}

Object.defineProperty(window, "IntersectionObserver", {
  value: IntersectionObserverMock,
})
Object.defineProperty(globalThis, "IntersectionObserver", {
  value: IntersectionObserverMock,
  writable: true,
  configurable: true,
})
