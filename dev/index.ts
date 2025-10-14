import css from './index.css?url'
import { createElement } from './utils'

const iframe = document.querySelector('iframe')!
const nav = document.querySelector('nav')!

const urls = Object.fromEntries(
  Object.entries(
    import.meta.glob('./examples/*.ts', { eager: true, import: 'default', query: '?url' }),
  ).map(([key, entry]) => {
    return [key.split('/').pop()!.replace('.ts', ''), entry as string] as const
  }),
)

Object.entries(urls).forEach(([name, localUrl]) => {
  createElement('a', {
    onclick(event) {
      event.preventDefault()
      load(name, localUrl)
    },
    innerHTML: name,
    parentElement: nav,
    'data-route': name,
  })
})

function load(name: string, url: string) {
  history.pushState(url, '', name)

  URL.revokeObjectURL(iframe.src)

  nav.querySelectorAll('a').forEach(button => {
    console.log(button)
    if (button.getAttribute('data-route') === name) {
      button.classList.add('active')
    } else {
      button.classList.remove('active')
    }
  })

  iframe.src = URL.createObjectURL(
    new Blob(
      [
        `<head>
<link rel="stylesheet" href="${origin}${css}"></link>
<script type="module" src="${origin}${url}"></script></head>`,
      ],
      {
        type: 'text/html',
      },
    ),
  )
}

const [, path, ...rest] = window.location.pathname.split('/')
if (rest.length === 0 && path && path in urls) {
  load(path, urls[path]!)
}
