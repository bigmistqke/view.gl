import type {
  AttributeKind,
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
import { createGLProgram } from './utils'

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
      return (name: string, options?: { size?: number }) => ({
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
      return (name: string, instanced?: boolean) => ({
        type: 'attribute',
        name,
        instanced,
        kind: property,
      })
    },
  },
)

export function interleave<
  const TName extends string,
  const TLayout extends Array<AttributeTag<string, AttributeKind, undefined>>,
  const TInstanced extends boolean,
>(name: TName, layout: TLayout, instanced: TInstanced): InterleaveTag<TName, TLayout, TInstanced>
export function interleave<
  const TName extends string,
  const TLayout extends Array<AttributeTag<string, AttributeKind, undefined>>,
>(name: TName, layout: TLayout): InterleaveTag<TName, TLayout, false>
export function interleave<
  const TName extends string,
  const TLayout extends Array<AttributeTag<string, AttributeKind, undefined>>,
  const TInstanced extends boolean,
>(name: TName, layout: TLayout, instanced?: TInstanced) {
  return {
    type: 'interleavedAttribute',
    name,
    layout: layout.map(({ name, kind }) => ({
      name,
      kind,
    })),
    instanced: !!instanced as TInstanced,
  } as InterleaveTag<TName, TLayout, TInstanced>
}

/**********************************************************************************/
/*                                                                                */
/*                                       GLSL                                     */
/*                                                                                */
/**********************************************************************************/

export function glsl<
  Elem extends string,
  Template extends ReadonlyArray<Elem>,
  Hole extends UniformTag | AttributeTag | InterleaveTag | string,
  Holes extends Hole[],
>([initial, ...rest]: Template, ...holes: [...Holes]) {
  const template = rest.reduce((out, templatePart, index) => {
    const hole = holes[index]
    const holePart =
      typeof hole === 'string'
        ? hole
        : hole.type === 'interleavedAttribute'
        ? hole.layout.reduce((a, v) => `${a}attribute ${v.kind} ${v.name}`, '')
        : typeof hole === 'object' && hole.type === 'uniform' && 'size' in hole
        ? `${hole.type} ${hole.kind} ${hole.name}[${hole.size}]`
        : `${hole.type} ${hole.kind} ${hole.name}`
    return out + holePart + templatePart
  }, initial || '')

  return holes.reduce(
    (resources, resource) => {
      if (typeof resource === 'string') {
        return resources
      }
      // @ts-expect-error
      resources[`${resource.type}s`][resource.name] = resource
      return resources
    },
    {
      template,
      uniforms: {} as {
        [K in Extract<Holes[number], UniformTag> as K['name']]: Prettify<Omit<K, 'name' | 'type'>>
      },
      attributes: {} as {
        [K in Extract<Holes[number], AttributeTag> as K['name']]: Prettify<Omit<K, 'name' | 'type'>>
      },
      interleavedAttributes: {} as {
        [K in Extract<Holes[number], InterleaveTag> as K['name']]: Prettify<
          Omit<K, 'name' | 'type'>
        >
      },
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
  const program = createGLProgram(gl, vertex.template, fragment.template)

  return {
    program,
    schema: {
      uniforms: {
        ...vertex.uniforms,
        ...fragment.uniforms,
      } as Merge<TVertex['uniforms'], TFragment['uniforms']>,
      attributes: {
        ...vertex.attributes,
        ...fragment.attributes,
      } as Merge<TVertex['attributes'], TFragment['attributes']>,
      interleavedAttributes: {
        ...vertex.interleavedAttributes,
        ...fragment.interleavedAttributes,
      } as Merge<TVertex['interleavedAttributes'], TFragment['interleavedAttributes']>,
    },
  }
}
