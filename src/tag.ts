import { toID } from '.'
import type {
  AttributeKind,
  AttributeOptions,
  AttributeTag,
  AttributeTagFn,
  GLSL,
  InterleaveTag,
  Merge,
  Prettify,
  UniformKind,
  UniformOptions,
  UniformTag,
} from './types'
import { createProgram } from './utils'

/**********************************************************************************/
/*                                                                                */
/*                                  Tag Utilities                                 */
/*                                                                                */
/**********************************************************************************/

interface UniformTagFn<TKind extends UniformKind> {
  <const TKey extends string | symbol, const TOptions extends Omit<UniformOptions, 'kind'>>(
    key: TKey,
    TOptions: TOptions,
  ): Prettify<UniformTag<TKey, TKind, TOptions>>
  <const TName extends string | symbol>(key: TName): Prettify<UniformTag<TName, TKind>>
}

export const uniform = new Proxy(
  {} as {
    [TKey in UniformKind]: UniformTagFn<TKey>
  },
  {
    get(target, property) {
      // @ts-expect-error
      if (typeof property === 'symbol') return target[property]
      return (key: string, options?: Omit<UniformOptions, 'kind'>) => ({
        type: 'uniform',
        key,
        kind: property,
        ...options,
      })
    },
  },
)

export const attribute = new Proxy(
  {} as {
    [TKey in AttributeKind]: AttributeTagFn<TKey>
  },
  {
    get(target, property) {
      // @ts-expect-error
      if (typeof property === 'symbol') return target[property]
      return (key: string, options?: Omit<AttributeOptions, 'kind'>) => ({
        type: 'attribute',
        key,
        kind: property,
        ...options,
      })
    },
  },
)

export function interleave<
  const TKey extends string | symbol,
  const TLayout extends Array<AttributeTag<string | symbol, AttributeKind, undefined>>,
  const TOptions extends Omit<AttributeOptions, 'kind'>,
>(key: TKey, layout: TLayout, instanced: TOptions): InterleaveTag<TKey, TLayout, TOptions>
export function interleave<
  const TKey extends string | symbol,
  const TLayout extends Array<AttributeTag<string | symbol, AttributeKind, undefined>>,
>(key: TKey, layout: TLayout): InterleaveTag<TKey, TLayout, { instanced: false }>
export function interleave<
  const TKey extends string | symbol,
  const TLayout extends Array<AttributeTag<string | symbol, AttributeKind, undefined>>,
  const TOptions extends Omit<AttributeOptions, 'kind'>,
>(key: TKey, layout: TLayout, { instanced, buffer }: Partial<TOptions> = {}) {
  return {
    type: 'interleavedAttribute',
    key,
    // remove instanced- and type-property
    layout: layout.map(({ key, kind }) => ({
      key,
      kind,
    })),
    instanced: !!instanced,
    buffer,
  } as unknown as InterleaveTag<TKey, TLayout, TOptions>
}

/**********************************************************************************/
/*                                                                                */
/*                                       GLSL                                     */
/*                                                                                */
/**********************************************************************************/

export function glsl<
  Elem extends string,
  Template extends ReadonlyArray<Elem>,
  Hole extends UniformTag | AttributeTag | InterleaveTag | string | number | symbol,
  Holes extends Hole[],
>([initial, ...rest]: Template, ...holes: [...Holes]) {
  const v300 = initial?.startsWith('#version 300 es')

  const template = rest.reduce((out, templatePart, index) => {
    const hole = holes[index]
    const holePart =
      typeof hole === 'string' || typeof hole === 'number' || typeof hole === 'symbol'
        ? toID(hole)
        : hole.type === 'interleavedAttribute'
          ? hole.layout.reduce(
              (a, v) =>
                v300
                  ? `${a}in ${v.kind} ${toID(v.key)};\n`
                  : `${a}attribute ${v.kind} ${toID(v.key)};\n`,
              '',
            )
          : typeof hole === 'object' && hole.type === 'uniform' && 'size' in hole
            ? `${hole.type} ${hole.kind} ${toID(hole.key)}[${hole.size}];`
            : `${hole.type === 'attribute' && v300 ? 'in' : hole.type} ${hole.kind} ${toID(hole.key)};`
    return out + holePart + templatePart
  }, initial || '')

  return holes.reduce(
    (resources, resource) => {
      if (
        typeof resource === 'string' ||
        typeof resource === 'number' ||
        typeof resource === 'symbol'
      ) {
        return resources
      }
      // @ts-expect-error
      const { key: name, type, ...rest } = resource
      // @ts-expect-error
      resources[`${type}s`][name] = rest
      return resources
    },
    {
      template,
      uniforms: {},
      attributes: {},
      interleavedAttributes: {},
    } as {
      template: string
      uniforms: {
        [K in Extract<Holes[number], UniformTag> as K['key']]: Prettify<Omit<K, 'name' | 'type'>>
      }
      attributes: {
        [K in Extract<Holes[number], AttributeTag> as K['key']]: Prettify<Omit<K, 'name' | 'type'>>
      }
      interleavedAttributes: {
        [K in Extract<Holes[number], InterleaveTag> as K['key']]: Prettify<Omit<K, 'name' | 'type'>>
      }
    },
  )
}

/**********************************************************************************/
/*                                                                                */
/*                                     Compile                                    */
/*                                                                                */
/**********************************************************************************/

export function compile<TVertex extends GLSL, TFragment extends GLSL>(
  gl: WebGLRenderingContext,
  vertex: TVertex,
  fragment: TFragment,
) {
  const program = createProgram(gl, vertex.template, fragment.template)

  return {
    program,
    schema: {
      uniforms: {
        ...vertex.uniforms,
        ...fragment.uniforms,
      },
      attributes: {
        ...vertex.attributes,
        ...fragment.attributes,
      },
      interleavedAttributes: {
        ...vertex.interleavedAttributes,
        ...fragment.interleavedAttributes,
      },
    },
  } as {
    program: WebGLProgram
    schema: {
      uniforms: Prettify<Merge<TVertex['uniforms'], TFragment['uniforms']>>
      attributes: Prettify<Merge<TVertex['attributes'], TFragment['attributes']>>
      interleavedAttributes: Prettify<
        Merge<TVertex['interleavedAttributes'], TFragment['interleavedAttributes']>
      >
    }
  }
}
