export function expose() {}
export function wrap() {
  return {};
}
export function proxy<T>(callback: T): T {
  return callback;
}
