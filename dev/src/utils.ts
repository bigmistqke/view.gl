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

export function dom<T extends keyof HTMLElementTagNameMap>(
  tag: T,
  {
    parentElement,
    ...options
  }: Partial<Omit<HTMLElementTagNameMap[T], 'style'> & { style: Partial<CSSStyleDeclaration> }> &
    Record<`data-${string}`, string> = {},
) {
  const element = document.createElement(tag)

  for (const key in options) {
    if (key.startsWith('data-')) {
      element.setAttribute(
        key,
        // @ts-expect-error
        options[key],
      )
    } else if (key == 'style') {
      if (typeof options.style === 'string') {
        element.style = options.style
      } else {
        options.style
        for (const prop of options.style!) {
          element.style[prop] = options.style![prop as any]
        }
      }
    }
    {
      // @ts-expect-error
      element[key] = options[key]
    }
  }

  parentElement?.appendChild(element)

  return element
}
