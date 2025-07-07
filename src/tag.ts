import { attributeView, interleavedAttributeView, uniformView } from './index'
import type {
  AttributeKind,
  AttributeOptions,
  InterleavedAttributeOptions,
  Merge,
  Prettify,
  UniformKind,
} from './types'
import { createGLProgram } from './utils'

interface GLSL {
  template: string
  uniforms: Record<string, UniformKind>
  attributes: Record<string, AttributeOptions>
  interleavedAttributes: Record<string, InterleavedAttributeOptions>
}

interface UniformTag<TName extends string = string, TKind extends UniformKind = UniformKind> {
  type: 'uniform'
  kind: TKind
  name: TName
}

interface AttributeTag<
  TName extends string = string,
  TKind extends AttributeKind = AttributeKind,
  TInstanced extends boolean | undefined = boolean,
> {
  type: 'attribute'
  kind: TKind
  instanced: TInstanced
  name: TName
}

interface AttributeTagFn<TKey extends AttributeKind> {
  <TName extends string, TInstanced extends boolean>(name: TName, instanced: TInstanced): Prettify<
    AttributeTag<TName, TKey, TInstanced>
  >
  <TName extends string>(name: TName): Prettify<AttributeTag<TName, TKey, undefined>>
}

interface InterleaveTag<
  TName extends string = string,
  TLayout extends Array<AttributeTag<string, AttributeKind, undefined>> = Array<
    AttributeTag<string, AttributeKind, undefined>
  >,
  TInstanced extends boolean | undefined = boolean,
> {
  name: TName
  type: 'interleavedAttribute'
  layout: {
    [TKey in keyof TLayout]: Prettify<Pick<TLayout[TKey], 'kind' | 'name'>>
  }
  instanced: TInstanced
}

export function glsl<
  Elem extends string,
  Template extends ReadonlyArray<Elem>,
  Hole extends UniformTag | AttributeTag | InterleaveTag | string,
  Holes extends Hole[],
>(template: Template, ...holes: [...Holes]) {
  return holes.reduce(
    (resources, resource) => {
      if (typeof resource === 'string') {
        return resources
      }
      // @ts-expect-error
      resources[`${resource.type}s`][resource.name] =
        resource.type === 'uniform' ? resource['kind'] : resource
      return resources
    },
    {
      template: template.slice(1).reduce((out, templatePart, index) => {
        const hole = holes[index]
        const holePart =
          typeof hole === 'string'
            ? hole
            : hole.type === 'interleavedAttribute'
            ? hole.layout.reduce((a, v) => `${a}attribute ${v.kind} ${v.name};\n`, '')
            : `${hole.type} ${hole.kind} ${hole.name};`
        return out + holePart + templatePart
      }, template[0] as string),
      uniforms: {} as {
        [K in Extract<Holes[number], UniformTag> as K['name']]: K['kind']
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

export const uniform = new Proxy(
  {} as {
    [TKey in UniformKind]: <TName extends string>(name: TName) => Prettify<UniformTag<TName, TKey>>
  },
  {
    get(target, property) {
      // @ts-expect-error
      if (typeof property === 'symbol') return target[property]
      return (name: string) => ({
        type: 'uniform',
        name,
        kind: property,
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

export function compile<TVertex extends GLSL, TFragment extends GLSL>(
  gl: WebGLRenderingContext,
  vertex: TVertex,
  fragment: TFragment,
  signal?: AbortSignal,
) {
  const program = createGLProgram(gl, vertex.template, fragment.template)

  return {
    program,
    attributes: attributeView(
      gl,
      program,
      {
        ...vertex.attributes,
        ...fragment.attributes,
      } as Merge<TVertex['attributes'], TFragment['attributes']>,
      signal,
    ),
    uniforms: uniformView(gl, program, {
      ...vertex.uniforms,
      ...fragment.uniforms,
    } as Merge<TVertex['uniforms'], TFragment['uniforms']>),
    interleavedAttributes: interleavedAttributeView(
      gl,
      program,
      {
        ...vertex.interleavedAttributes,
        ...fragment.interleavedAttributes,
      } as Merge<TVertex['interleavedAttributes'], TFragment['interleavedAttributes']>,
      signal,
    ),
  }
}
