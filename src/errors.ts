/**
 * A shader that did not compile. `infoLog` is what the driver answered, `null`
 * and `''` kept apart; `glError` is `getError()` read at the failure.
 */
export class ShaderCompileError extends Error {
  override name = 'ShaderCompileError'

  constructor(
    readonly stage: 'vertex' | 'fragment',
    readonly infoLog: string | null,
    readonly glError: number,
  ) {
    super(`Failed to compile ${stage} shader: ${infoLog}`)
  }
}

/**
 * A program that did not link. `infoLog` is what the driver answered, `null`
 * and `''` kept apart; `glError` is `getError()` read at the failure.
 */
export class ProgramLinkError extends Error {
  override name = 'ProgramLinkError'

  constructor(
    readonly infoLog: string | null,
    readonly glError: number,
  ) {
    super(`Failed to link program: ${infoLog}`)
  }
}

export type GLResource = 'shader' | 'program' | 'buffer' | 'vertexArray' | 'texture' | 'framebuffer'

/** A `create*` call that answered `null`. */
export class GLCreateError extends Error {
  override name = 'GLCreateError'

  constructor(readonly resource: GLResource) {
    super(`Failed to create ${resource}`)
  }
}

/** A program with no active attribute of that name: `getAttribLocation` answered -1. */
export class AttributeNotFoundError extends Error {
  override name = 'AttributeNotFoundError'

  constructor(readonly attribute: string) {
    super(`Attribute '${attribute}' not found`)
  }
}

/** Throws a {@link GLCreateError} for a `create*` that answered `null`. */
export function created<T>(value: T | null, resource: GLResource): T {
  if (value === null) {
    throw new GLCreateError(resource)
  }
  return value
}
