import { toID, view } from '.'
import type { Prettify } from './type-utils'
import type {
  AttributeDefinition,
  AttributeKind,
  AttributeTokenFn as AttributeTagMethod,
  AttributeToken,
  CompileResult,
  GL,
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
import { createProgram, createUpsertMap } from './utils'

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

export interface CompileOptions<TSchema extends ViewSchemaPartial> {
  schema?: TSchema
  webgl2?: boolean
}

export function compile<
  TVertex extends GLSL,
  TFragment extends GLSL,
  TSchema extends ViewSchemaPartial,
>(
  gl: WebGLRenderingContext,
  vertex: TVertex,
  fragment: TFragment,
  options?: CompileOptions<TSchema> | undefined,
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

  // Deep merge options.schema with generated schema
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

  try {
    const program = createProgram(gl, _vertex.template, _fragment.template)

    return {
      program,
      schema,
      view: view(gl, program, schema),
      vertex: _vertex.template,
      fragment: _fragment.template,
    } as unknown as Prettify<CompileResult<TVertex, TFragment, TSchema>>
  } catch (error) {
    console.error('Error while creating WebGLProgram - vertex\n\n', _vertex.template)
    console.error('Error while creating WebGLProgram - fragment\n\n', _fragment.template)

    throw error
  }
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

  tag.slots.forEach(function handleSlot(slot: GLSLSlot) {
    if (typeof slot !== 'object') {
      return
    }

    if (Array.isArray(slot)) {
      slot.forEach(handleSlot)
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
  })

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

  switch (slot.type) {
    case 'glsl':
      return compile.toString(slot)
    case 'interleavedAttribute':
      return slot.layout.reduce(
        (a, v) =>
          v300 ? `${a}in ${v.kind} ${toID(v.key)};\n` : `${a}attribute ${v.kind} ${toID(v.key)};\n`,
        '',
      )
    case 'uniform':
      if ('size' in slot) {
        return `${slot.type} ${slot.kind} ${toID(slot.key)}[${slot.size}];`
      }
      return `${slot.type} ${slot.kind} ${toID(slot.key)};`
  }

  if (slot.type === 'attribute') {
    return `${v300 ? 'in' : slot.type} ${slot.kind} ${toID(slot.key)};`
  }

  throw new Error(`Unexpected slot: ${JSON.stringify(slot)}`)
}

const QUAD_FLOAT_ARRAY = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])
const QUAD_BUFFER_MAP = createUpsertMap(WeakMap<GL, WebGLBuffer>)

compile.toQuad = function <TFragment extends GLSL, TSchema extends ViewSchemaPartial>(
  gl: GL,
  fragment: TFragment,
  options?: CompileOptions<TSchema>,
) {
  const buffer = QUAD_BUFFER_MAP.getOrInsert(gl, gl.createBuffer.bind(gl))

  const webgl2 = options?.webgl2 ?? fragment.template[0]?.startsWith('#version 300 es')

  const vertex = webgl2
    ? glsl`#version 300 es
precision mediump float;

${attribute.vec2('a_quad', { buffer })}

out vec2 v_uv;

void main() {
  v_uv = a_quad;
  gl_Position = vec4(v_uv, 0.0, 1.0);
}`
    : glsl`precision mediump float;

${attribute.vec2('a_quad', { buffer })}

varying vec2 v_uv;

void main() {
  v_uv = a_quad;
  gl_Position = vec4(v_uv, 0.0, 1.0);
}`

  const result = compile(gl, vertex, fragment, options)

  // @ts-expect-error
  result.view.attributes.a_quad.set(QUAD_FLOAT_ARRAY)

  return result
}
