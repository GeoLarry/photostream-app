// jsdom has no IntersectionObserver. This stand-in records what is observed and lets a spec
// say when an element scrolls into view: FakeIntersectionObserver.latest?.enter().
export class FakeIntersectionObserver {
  static latest: FakeIntersectionObserver | null = null;

  readonly observed: Element[] = [];
  disconnected = false;

  constructor(private callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.latest = this;
  }

  observe(element: Element): void {
    this.observed.push(element);
  }

  unobserve(element: Element): void {
    this.observed.splice(this.observed.indexOf(element), 1);
  }

  disconnect(): void {
    this.disconnected = true;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  // Simulates every observed element scrolling into view.
  enter(): void {
    const entries = this.observed.map(target => ({ target, isIntersecting: true }) as IntersectionObserverEntry);
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}
