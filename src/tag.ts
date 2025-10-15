import { toID } from '.'
import type {
  AttributeKind,
  AttributeOptions,
  AttributeTag,
  AttributeTagFn as AttributeTagMethod,
  GLSLResult,
  GLSLSlot,
  GLSLTag,
  InterleaveTag,
  Prettify,
  UniformKind,
  UniformOptions,
  UniformTag,
  UniformTagFn as UniformTagMethod,
} from './types'
import { createProgram } from './utils'

export function glsl<TSlot extends GLSLSlot, TSlots extends TSlot[]>(
  template: TemplateStringsArray,
  ...slots: [...TSlots]
): GLSLTag<TSlots> {
  return { template, slots }
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

export function compile<
  TVertex extends ReturnType<typeof glsl>,
  TFragment extends ReturnType<typeof glsl>,
>(gl: WebGLRenderingContext, vertex: TVertex, fragment: TFragment) {
  const _vertex = resolveGLSLTag(vertex)
  const _fragment = resolveGLSLTag(fragment)

  const program = createProgram(gl, _vertex.template, _fragment.template)

  return {
    program,
    schema: {
      uniforms: {
        ..._vertex.uniforms,
        ..._fragment.uniforms,
      },
      attributes: {
        ..._vertex.attributes,
        ..._fragment.attributes,
      },
      interleavedAttributes: {
        ..._vertex.interleavedAttributes,
        ..._fragment.interleavedAttributes,
      },
    },
  } satisfies GLSLResult
}

interface ResolveGLSLTag<T extends GLSLTag> {
  template: string
  uniforms: {
    [K in Extract<T['slots'][number], UniformTag> as K['key']]: Prettify<Omit<K, 'name' | 'type'>>
  }
  attributes: {
    [K in Extract<T['slots'][number], AttributeTag> as K['key']]: Prettify<Omit<K, 'name' | 'type'>>
  }
  interleavedAttributes: {
    [K in Extract<T['slots'][number], InterleaveTag> as K['key']]: Prettify<
      Omit<K, 'name' | 'type'>
    >
  }
}

function resolveGLSLTag<TTag extends ReturnType<typeof glsl>>({
  template: [initial, ...rest],
  slots,
}: TTag) {
  const v300 = !!initial?.startsWith('#version 300 es')

  let template = initial ?? ''

  for (let i = 0; i < rest.length; i++) {
    template += `${resolveGLSLSlot(slots[i]!, v300)}${rest[i]}`
  }

  const result = {
    template,
    uniforms: {},
    attributes: {},
    interleavedAttributes: {},
  } as ResolveGLSLTag<TTag>

  for (const slot of slots) {
    if (typeof slot === 'string' || typeof slot === 'number' || typeof slot === 'symbol') {
      continue
    }

    const { key: name, type, ...rest } = slot

    // @ts-expect-error
    result[`${type}s`][name] = rest
  }

  return result
}

function resolveGLSLSlot(slot: GLSLSlot, v300: boolean) {
  if (typeof slot === 'string' || typeof slot === 'number' || typeof slot === 'symbol') {
    return toID(slot)
  }

  if (slot.type === 'interleavedAttribute') {
    return slot.layout.reduce(
      (a, v) =>
        v300 ? `${a}in ${v.kind} ${toID(v.key)};\n` : `${a}attribute ${v.kind} ${toID(v.key)};\n`,
      '',
    )
  }

  if (typeof slot === 'object' && slot.type === 'uniform' && 'size' in slot) {
    return `${slot.type} ${slot.kind} ${toID(slot.key)}[${slot.size}];`
  }

  return `${slot.type === 'attribute' && v300 ? 'in' : slot.type} ${slot.kind} ${toID(slot.key)};`
}
