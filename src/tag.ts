import { toID, view } from '.'
import type {
  AttributeKind,
  AttributeOptions,
  AttributeTag,
  AttributeTagFn as AttributeTagMethod,
  GLSLSlot,
  GLSLTag,
  InterleaveTag,
  Prettify,
  Spread,
  UniformKind,
  UniformOptions,
  UniformTag,
  UniformTagFn as UniformTagMethod,
  View,
  ViewSchema,
} from './types'
import { createProgram } from './utils'

export function glsl<TSlot extends GLSLSlot, TSlots extends TSlot[]>(
  template: TemplateStringsArray,
  ...slots: [...TSlots]
): GLSLTag<TSlots> {
  return { template, slots, type: 'glsl' }
}

export const uniform = new Proxy(
  {} as {
    [TKey in UniformKind]: UniformTagMethod<TKey>
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
    [TKey in AttributeKind]: AttributeTagMethod<TKey>
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
/*                                     Compile                                    */
/*                                                                                */
/**********************************************************************************/

type glslTagToSchema<TTag extends GLSLTag> =
  FlattenSlots<TTag> extends infer TSlots
    ? TSlots extends Array<any>
      ? GLSLSlotsToSchema<TSlots>
      : never
    : never

type GLSLSlotsToSchema<TSlots extends Array<GLSLSlot>> = {
  uniforms: {
    [K in Extract<TSlots[number], UniformTag> as K['key']]: Prettify<Omit<K, 'name' | 'type'>>
  }
  attributes: {
    [K in Extract<TSlots[number], AttributeTag> as K['key']]: Prettify<Omit<K, 'name' | 'type'>>
  }
  interleavedAttributes: {
    [K in Extract<TSlots[number], InterleaveTag> as K['key']]: Prettify<Omit<K, 'name' | 'type'>>
  }
}

type FlattenSlots<T> =
  T extends GLSLTag<infer TSlots>
    ? _FlattenSlots<TSlots>
    : T extends Array<GLSLSlot>
      ? _FlattenSlots<T>
      : never

type _FlattenSlots<T extends Array<GLSLSlot>> = T extends [infer First, ...infer Rest]
  ? First extends GLSLTag
    ? [...FlattenSlots<First>, ...FlattenSlots<Rest>]
    : First extends unknown[]
      ? [...FlattenSlots<First>, ...FlattenSlots<Rest>]
      : [First, ...FlattenSlots<Rest>]
  : []

type MergeGLSLSchema<TVertex extends Record<string, any>, TFragment extends Record<string, any>> = {
  uniforms: Spread<[TVertex['uniforms'], TFragment['uniforms']]>
  attributes: Spread<[TVertex['attributes'], TFragment['attributes']]>
  interleavedAttributes: Spread<
    [TVertex['interleavedAttributes'], TFragment['interleavedAttributes']]
  >
}

type CompileResult<TVertex extends GLSLTag, TFragment extends GLSLTag> =
  MergeGLSLSchema<
    glslTagToSchema<TVertex>,
    glslTagToSchema<TFragment>
  > extends infer TSchema extends ViewSchema
    ? {
        program: WebGLProgram
        schema: TSchema
        view: View<TSchema>
      }
    : never

export function compile<TVertex extends GLSLTag, TFragment extends GLSLTag>(
  gl: WebGLRenderingContext,
  vertex: TVertex,
  fragment: TFragment,
) {
  const _vertex = resolveGLSLTag(vertex)
  const _fragment = resolveGLSLTag(fragment)

  const schema = {
    uniforms: {
      ..._vertex.schema.uniforms,
      ..._fragment.schema.uniforms,
    },
    attributes: {
      ..._vertex.schema.attributes,
      ..._fragment.schema.attributes,
    },
    interleavedAttributes: {
      ..._vertex.schema.interleavedAttributes,
      ..._fragment.schema.interleavedAttributes,
    },
  }

  const program = createProgram(gl, _vertex.template, _fragment.template)

  return {
    program: program,
    schema,
    view: view(gl, program, schema),
  } as CompileResult<TVertex, TFragment>
}

function resolveGLSLTag<TTag extends GLSLTag>(tag: TTag) {
  return {
    template: glslTagToString(tag),
    schema: glslTagToSchema(tag),
  }
}

function glslTagToSchema<TTag extends GLSLTag>(tag: TTag) {
  const result = {
    uniforms: {},
    attributes: {},
    interleavedAttributes: {},
  }

  for (const slot of tag.slots) {
    if (typeof slot !== 'object') {
      continue
    }

    if (slot.type === 'glsl') {
      const { uniforms, attributes, interleavedAttributes } = glslTagToSchema(slot)

      result.uniforms = {
        ...result.uniforms,
        ...uniforms,
      }
      result.attributes = {
        ...result.attributes,
        ...attributes,
      }
      result.interleavedAttributes = {
        ...result.interleavedAttributes,
        ...interleavedAttributes,
      }

      continue
    }

    const { key: name, type, ...rest } = slot

    // @ts-expect-error
    result[`${type}s`][name] = rest
  }

  return result
}

function glslTagToString<TTag extends GLSLTag>({ template: [initial, ...rest], slots }: TTag) {
  const v300 = !!initial?.startsWith('#version 300 es')

  let template = initial ?? ''

  for (let i = 0; i < rest.length; i++) {
    template += `${glslSlotToString(slots[i]!, v300)}${rest[i]}`
  }

  return template
}

function glslSlotToString(slot: GLSLSlot, v300: boolean) {
  if (typeof slot !== 'object') {
    return toID(slot)
  }

  if (slot.type === 'glsl') {
    return glslTagToString(slot)
  }

  if (slot.type === 'interleavedAttribute') {
    return slot.layout.reduce(
      (a, v) =>
        v300 ? `${a}in ${v.kind} ${toID(v.key)};\n` : `${a}attribute ${v.kind} ${toID(v.key)};\n`,
      '',
    )
  }

  if (slot.type === 'uniform' && 'size' in slot) {
    return `${slot.type} ${slot.kind} ${toID(slot.key)}[${slot.size}];`
  }

  return `${slot.type === 'attribute' && v300 ? 'in' : slot.type} ${slot.kind} ${toID(slot.key)};`
}
