export function forEach<T extends Record<string, any>>(
  value: T,
  callback: (value: T[keyof T], key: keyof T, index: number) => void,
) {
  let index = 0
  for (const key in value) {
    callback(value[key], key, index)
    index++
  }
  for (const key of Object.getOwnPropertySymbols(value)) {
    callback(value[key as keyof T], key as keyof T, index)
    index++
  }
}

export function map<T extends Record<string, any>, TReturn>(
  value: T,
  callback: (value: T[keyof T], key: keyof T, index: number) => TReturn,
): { [TKey in keyof T]: TReturn } {
  const result = {} as { [TKey in keyof T]: TReturn }

  forEach(value, (value, key, index) => {
    result[key] = callback(value, key, index)
  })

  return result
}
