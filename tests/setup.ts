// jsdom has no canvas and no scrolling. Stub both so the code paths that tolerate a
// missing 2D context are exercised and jsdom does not print "not implemented".
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
}
if (typeof window !== 'undefined') {
  window.scrollTo = (() => {}) as typeof window.scrollTo;
}
