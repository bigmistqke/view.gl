type CursorEvent = PointerEvent & {
  distanceX: number
  distanceY: number
  deltaX: number
  deltaY: number
}

export function cursor(event: PointerEvent, callback: (event: CursorEvent) => void) {
  const { promise, resolve } = Promise.withResolvers<void>()
  const controller = new AbortController()

  const initialX = event.clientX
  const initialY = event.clientY

  let previousX = event.clientX
  let previousY = event.clientY

  window.addEventListener(
    'pointermove',
    event => {
      callback(
        Object.assign(event, {
          distanceX: initialX - event.clientX,
          distanceY: initialY - event.clientY,
          deltaX: previousX - event.clientX,
          deltaY: previousY - event.clientY,
        }),
      )
      previousX = event.clientX
      previousY = event.clientY
    },
    controller,
  )
  window.addEventListener(
    'pointerup',
    () => {
      controller.abort()
      resolve()
    },
    controller,
  )

  return promise
}

export function createElement<T extends keyof HTMLElementTagNameMap>(
  tag: T,
  {
    parentElement,
    ...options
  }: Partial<Omit<HTMLElementTagNameMap[T], 'style'> & { style: string }> = {},
) {
  const element = document.createElement(tag)
  for (const key in options) {
    element[key] = options[key]
  }

  ;(parentElement ?? document.body).appendChild(element)

  return element
}
