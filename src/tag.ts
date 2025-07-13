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
  <const TName extends string, const TOptions extends Omit<UniformOptions, 'kind'>>(
    name: TName,
    TOptions: TOptions,
  ): Prettify<UniformTag<TName, TKind, TOptions>>
  <const TName extends string>(name: TName): Prettify<UniformTag<TName, TKind>>
}

export const uniform = new Proxy(
  {} as {
    [TKey in UniformKind]: UniformTagFn<TKey>
  },
  {
    get(target, property) {
      // @ts-expect-error
      if (typeof property === 'symbol') return target[property]
      return (name: string, options?: Omit<UniformOptions, 'kind'>) => ({
        type: 'uniform',
        name,
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
      return (name: string, options?: Omit<AttributeOptions, 'kind'>) => ({
        type: 'attribute',
        name,
        kind: property,
        ...options,
      })
    },
  },
)

export function interleave<
  const TName extends string,
  const TLayout extends Array<AttributeTag<string, AttributeKind, undefined>>,
  const TOptions extends Omit<AttributeOptions, 'kind'>,
>(name: TName, layout: TLayout, instanced: TOptions): InterleaveTag<TName, TLayout, TOptions>
export function interleave<
  const TName extends string,
  const TLayout extends Array<AttributeTag<string, AttributeKind, undefined>>,
>(name: TName, layout: TLayout): InterleaveTag<TName, TLayout, { instanced: false }>
export function interleave<
  const TName extends string,
  const TLayout extends Array<AttributeTag<string, AttributeKind, undefined>>,
  const TOptions extends Omit<AttributeOptions, 'kind'>,
>(name: TName, layout: TLayout, { instanced, buffer }?: TOptions = {}) {
  return {
    type: 'interleavedAttribute',
    name,
    // remove instanced- and type-property
    layout: layout.map(({ name, kind }) => ({
      name,
      kind,
    })),
    instanced: !!instanced,
    buffer,
  } as InterleaveTag<TName, TLayout, TOptions>
}

/**********************************************************************************/
/*                                                                                */
/*                                       GLSL                                     */
/*                                                                                */
/**********************************************************************************/

export function glsl<
  Elem extends string,
  Template extends ReadonlyArray<Elem>,
  Hole extends UniformTag | AttributeTag | InterleaveTag | string | number,
  Holes extends Hole[],
>([initial, ...rest]: Template, ...holes: [...Holes]) {
  const v300 = initial?.startsWith('#version 300 es')
  const template = rest.reduce((out, templatePart, index) => {
    const hole = holes[index]
    const holePart =
      typeof hole === 'string' || typeof hole === 'number'
        ? hole
        : hole.type === 'interleavedAttribute'
        ? hole.layout.reduce(
            (a, v) =>
              v300 ? `${a}in ${v.kind} ${v.name};\n` : `${a}attribute ${v.kind} ${v.name};\n`,
            '',
          )
        : typeof hole === 'object' && hole.type === 'uniform' && 'size' in hole
        ? `${hole.type} ${hole.kind} ${hole.name}[${hole.size}];`
        : `${hole.type === 'attribute' && v300 ? 'in' : hole.type} ${hole.kind} ${hole.name};`
    return out + holePart + templatePart
  }, initial || '')

  return holes.reduce(
    (resources, resource) => {
      if (typeof resource === 'string' || typeof resource === 'number') {
        return resources
      }
      // @ts-expect-error
      resources[`${resource.type}s`][resource.name] = resource
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
        [K in Extract<Holes[number], UniformTag> as K['name']]: Prettify<Omit<K, 'name' | 'type'>>
      }
      attributes: {
        [K in Extract<Holes[number], AttributeTag> as K['name']]: Prettify<Omit<K, 'name' | 'type'>>
      }
      interleavedAttributes: {
        [K in Extract<Holes[number], InterleaveTag> as K['name']]: Prettify<
          Omit<K, 'name' | 'type'>
        >
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
