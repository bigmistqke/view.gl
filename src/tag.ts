import { toID, view } from '.'
import type { Prettify } from './type-utils'
import type {
  AttributeDefinition,
  AttributeKind,
  AttributeTokenFn as AttributeTagMethod,
  AttributeToken,
  CompileResult,
  GLSL,
  GLSLSlot,
  GLSLToSchema,
  InterleaveToken,
  UniformDefinition,
  UniformKind,
  UniformTokenFn as UniformTagMethod,
  ViewSchema,
  ViewSchemaPartial,
} from './types'
import { createProgram } from './utils'

export function glsl<TSlot extends GLSLSlot, TSlots extends TSlot[]>(
  template: TemplateStringsArray,
  ...slots: [...TSlots]
): GLSL<TSlots> {
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
      return (key: string, options?: Omit<UniformDefinition, 'kind'>) => ({
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
      return (key: string, options?: Omit<AttributeDefinition, 'kind'>) => ({
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
  const TLayout extends Array<AttributeToken<string | symbol, AttributeKind, undefined>>,
  const TOptions extends Omit<AttributeDefinition, 'kind'>,
>(key: TKey, layout: TLayout, instanced: TOptions): InterleaveToken<TKey, TLayout, TOptions>
export function interleave<
  const TKey extends string | symbol,
  const TLayout extends Array<AttributeToken<string | symbol, AttributeKind, undefined>>,
>(key: TKey, layout: TLayout): InterleaveToken<TKey, TLayout, { instanced: false }>
export function interleave<
  const TKey extends string | symbol,
  const TLayout extends Array<AttributeToken<string | symbol, AttributeKind, undefined>>,
  const TOptions extends Omit<AttributeDefinition, 'kind'>,
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
  } as unknown as InterleaveToken<TKey, TLayout, TOptions>
}

/**********************************************************************************/
/*                                                                                */
/*                                     Compile                                    */
/*                                                                                */
/**********************************************************************************/

export function compile<
  TVertex extends GLSL,
  TFragment extends GLSL,
  TOverride extends ViewSchemaPartial,
>(
  gl: WebGLRenderingContext,
  vertex: TVertex,
  fragment: TFragment,
  options?: { schema?: TOverride; webgl2: boolean },
) {
  const _vertex = resolveGLSLTag(vertex, options) as { template: string; schema: ViewSchema }
  const _fragment = resolveGLSLTag(fragment, options) as { template: string; schema: ViewSchema }

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

  for (const kind in options?.schema) {
    const schemaKind = schema[kind as keyof typeof schema]
    const configSchemaKind = options?.schema[kind]

    for (const key in configSchemaKind) {
      schemaKind[key] = {
        ...schemaKind[key],
        ...configSchemaKind[key],
      }
    }
  }

  const program = createProgram(gl, _vertex.template, _fragment.template)

  return {
    program,
    schema,
    view: view(gl, program, schema),
    vertex: _vertex.template,
    fragment: _fragment.template,
  } as unknown as Prettify<CompileResult<TVertex, TFragment, TOverride>>
}

function resolveGLSLTag<TTag extends GLSL>(tag: TTag, options?: { webgl2?: boolean }) {
  return {
    template: compile.toString(tag, options),
    schema: compile.toSchema(tag),
  }
}

compile.toSchema = function <TTag extends GLSL>(tag: TTag) {
  const result = {
    uniforms: {},
    attributes: {},
    interleavedAttributes: {},
  }

  function handleSlot(slot: GLSLSlot) {
    if (Array.isArray(slot)) {
      slot.forEach(handleSlot)
      return
    }

    if (typeof slot !== 'object') {
      return
    }

    if (slot.type === 'glsl') {
      const { uniforms, attributes, interleavedAttributes } = compile.toSchema(slot)

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

      return
    }

    const { key: name, type, ...rest } = slot

    // @ts-expect-error
    result[`${type}s`][name] = rest
  }

  tag.slots.forEach(handleSlot)

  return result as unknown as Prettify<GLSLToSchema<TTag>>
}

compile.toString = function <TTag extends GLSL>(
  { template: [initial, ...rest], slots }: TTag,
  config?: { webgl2?: boolean },
) {
  const v300 = config?.webgl2 ?? !!initial?.startsWith('#version 300 es')

  let template = initial ?? ''

  for (let i = 0; i < rest.length; i++) {
    template += `${resolveGlslSlotToString(slots[i]!, v300)}${rest[i]}`
  }

  return template
}

function resolveGlslSlotToString(slot: GLSLSlot, v300: boolean): string {
  if (typeof slot !== 'object') {
    return toID(slot)
  }

  if (Array.isArray(slot)) {
    return slot.map(slot => resolveGlslSlotToString(slot, v300)).join('')
  }

  if (slot.type === 'glsl') {
    return compile.toString(slot)
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
