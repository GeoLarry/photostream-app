// jsdom has no IntersectionObserver. This stand-in records what is observed and lets a spec
// say when an element scrolls into view: FakeIntersectionObserver.latest?.enter().
export class FakeIntersectionObserver {
  static latest: FakeIntersectionObserver | null = null;

  readonly observed: Element[] = [];
  disconnected = false;
  // Whether the observed elements are on screen, set by enter() and leave()
  private inView = false;

  constructor(private callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.latest = this;
  }

  // Like a real observer, a new observe() first reports where the element is right now.
  observe(element: Element): void {
    this.observed.push(element);
    if (this.inView) queueMicrotask(() => this.report([element]));
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
    this.inView = true;
    this.report(this.observed);
  }

  // Simulates every observed element scrolling out of view.
  leave(): void {
    this.inView = false;
    this.report(this.observed);
  }

  private report(targets: Element[]): void {
    const entries = targets.map(target => ({ target, isIntersecting: this.inView }) as IntersectionObserverEntry);
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}
