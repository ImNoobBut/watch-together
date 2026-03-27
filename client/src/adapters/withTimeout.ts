/**
 * Races `promise` against a timer. Rejects with `message` if `ms` elapses first.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let id: ReturnType<typeof setTimeout>;
  return new Promise<T>((resolve, reject) => {
    id = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      },
    );
  });
}
