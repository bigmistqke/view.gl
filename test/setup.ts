import { vi } from 'vitest'
import { createMockGL } from './mocks/webgl'

vi.stubGlobal('WebGLRenderingContext', createMockGL)
vi.stubGlobal('WebGL2RenderingContext', createMockGL)

// Mock canvas getContext to return our WebGL mock
HTMLCanvasElement.prototype.getContext = vi.fn(function (contextType: string) {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return createMockGL() as any
  }
  return null
})
