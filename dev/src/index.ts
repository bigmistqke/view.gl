import css from './index.css?url'
import { dom } from './utils'

const iframe = document.querySelector('iframe')!
const nav = document.querySelector('nav')!

nav.append(dom('h3', { innerText: 'Examples' }))

const urls = Object.fromEntries(
  Object.entries(import.meta.glob('./examples/*.ts', { eager: false })).map(([key, entry]) => {
    const name = key.split('/').pop()!.replace('.ts', '')
    const chunk = entry.toString().match(/import\(['"]([^'"]+)['"]/)![1]!
    return [name, chunk] as const
  }),
)

Object.entries(urls).forEach(([name, localUrl]) => {
  nav.append(
    dom('button', {
      onclick(event) {
        event.preventDefault()
        load(name, localUrl)
      },
      innerHTML: name.replaceAll('-', ' '),
      'data-route': name,
    }),
  )
})

function load(name: string, url: string) {
  // Use hash routing instead of pushState for GitHub Pages compatibility
  window.location.hash = name

  URL.revokeObjectURL(iframe.src)

  nav.querySelectorAll('button').forEach(button => {
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
<link rel="stylesheet" href="${new URL(css, import.meta.url).href}"></link>
<script type="module" src="${new URL(url, import.meta.url).href}"></script></head>`,
      ],
      {
        type: 'text/html',
      },
    ),
  )
}

// Handle hash-based routing
const hash = window.location.hash.slice(1) // Remove #
if (hash && hash in urls) {
  load(hash, urls[hash]!)
}

// Listen for hash changes
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1)
  if (hash && hash in urls) {
    load(hash, urls[hash]!)
  }
})
