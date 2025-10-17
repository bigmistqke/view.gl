export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type RemoveSuffix<T, S extends string> = {
  [K in keyof T as K extends `${infer Prefix}${S}` ? Prefix : K]: T[K]
}

export type DeepMerge<A extends readonly [...any]> = A extends [infer L, ...infer R]
  ? DeepMergeTwo<L, DeepMerge<R>>
  : unknown

type DeepMergeTwo<TBase, TOverride> = {
  [K in keyof TBase | keyof TOverride]: K extends keyof TOverride
    ? K extends keyof TBase
      ? ShallowMerge<[TBase[K], TOverride[K]]>
      : TOverride[K]
    : K extends keyof TBase
      ? TBase[K]
      : never
}

// see https://stackoverflow.com/a/49683575
export type ShallowMerge<A extends readonly [...any]> = A extends [infer L, ...infer R]
  ? ShallowMergeTwo<L, ShallowMerge<R>>
  : unknown

type OptionalPropertyNames<T> = {
  [K in keyof T]-?: {} extends { [P in K]: T[K] } ? K : never
}[keyof T]

type SpreadProperties<L, R, K extends keyof L & keyof R> = {
  [P in K]: L[P] | Exclude<R[P], undefined>
}

type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

type ShallowMergeTwo<L, R> = Id<
  Pick<L, Exclude<keyof L, keyof R>> &
    Pick<R, Exclude<keyof R, OptionalPropertyNames<R>>> &
    Pick<R, Exclude<OptionalPropertyNames<R>, keyof L>> &
    SpreadProperties<L, R, OptionalPropertyNames<R> & keyof L>
>
