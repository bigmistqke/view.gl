true              &&(function polyfill() {
	const relList = document.createElement("link").relList;
	if (relList && relList.supports && relList.supports("modulepreload")) return;
	for (const link of document.querySelectorAll("link[rel=\"modulepreload\"]")) processPreload(link);
	new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== "childList") continue;
			for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
		}
	}).observe(document, {
		childList: true,
		subtree: true
	});
	function getFetchOpts(link) {
		const fetchOpts = {};
		if (link.integrity) fetchOpts.integrity = link.integrity;
		if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
		if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
		else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
		else fetchOpts.credentials = "same-origin";
		return fetchOpts;
	}
	function processPreload(link) {
		if (link.ep) return;
		link.ep = true;
		const fetchOpts = getFetchOpts(link);
		fetch(link.href, fetchOpts);
	}
}());

const bezier = "/home/runner/work/view.gl/view.gl/dev/src/examples/bezier.ts";

const __vite_glob_0_0 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: bezier
}, Symbol.toStringTag, { value: 'Module' }));

const game_of_life = "/home/runner/work/view.gl/view.gl/dev/src/examples/game_of_life.ts";

const __vite_glob_0_1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: game_of_life
}, Symbol.toStringTag, { value: 'Module' }));

const grid = "/home/runner/work/view.gl/view.gl/dev/src/examples/grid.ts";

const __vite_glob_0_2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: grid
}, Symbol.toStringTag, { value: 'Module' }));

const overview = "/home/runner/work/view.gl/view.gl/dev/src/examples/overview.ts";

const __vite_glob_0_3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: overview
}, Symbol.toStringTag, { value: 'Module' }));

const pix_sim = "/home/runner/work/view.gl/view.gl/dev/src/examples/pix_sim.ts";

const __vite_glob_0_4 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: pix_sim
}, Symbol.toStringTag, { value: 'Module' }));

const symbol = "/home/runner/work/view.gl/view.gl/dev/src/examples/symbol.ts";

const __vite_glob_0_5 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: symbol
}, Symbol.toStringTag, { value: 'Module' }));

const tetris = "/home/runner/work/view.gl/view.gl/dev/src/examples/tetris.ts";

const __vite_glob_0_6 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: tetris
}, Symbol.toStringTag, { value: 'Module' }));

const css = "https://bigmistqke.github.io/view.gl/assets/index-C2N3u8wj.css";

function createElement(tag, {
  parentElement,
  ...options
} = {}) {
  const element = document.createElement(tag);
  for (const key in options) {
    if (key.startsWith("data-")) {
      element.setAttribute(key, options[key]);
    } else {
      element[key] = options[key];
    }
  }
  (parentElement ?? document.body).appendChild(element);
  return element;
}

const iframe = document.querySelector("iframe");
const nav = document.querySelector("nav");
createElement("h3", { innerText: "Examples", parentElement: nav });
const urls = Object.fromEntries(
  Object.entries(
    /* #__PURE__ */ Object.assign({"./examples/bezier.ts": __vite_glob_0_0,"./examples/game_of_life.ts": __vite_glob_0_1,"./examples/grid.ts": __vite_glob_0_2,"./examples/overview.ts": __vite_glob_0_3,"./examples/pix_sim.ts": __vite_glob_0_4,"./examples/symbol.ts": __vite_glob_0_5,"./examples/tetris.ts": __vite_glob_0_6


})
  ).map(([key, url]) => {
    const name = key.split("/").pop().replace(".ts", "");
    return [name, url];
  })
);
Object.entries(urls).forEach(([name, localUrl]) => {
  createElement("button", {
    onclick(event) {
      event.preventDefault();
      load(name, localUrl);
    },
    innerHTML: name,
    parentElement: nav,
    "data-route": name
  });
});
function load(name, url) {
  window.location.hash = name;
  URL.revokeObjectURL(iframe.src);
  nav.querySelectorAll("button").forEach((button) => {
    if (button.getAttribute("data-route") === name) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });
  iframe.src = URL.createObjectURL(
    new Blob(
      [
        `<head>
<link rel="stylesheet" href="${new URL(css, import.meta.url).href}"></link>
<script type="module" src="${new URL(url, import.meta.url).href}"><\/script></head>`
      ],
      {
        type: "text/html"
      }
    )
  );
}
const hash = window.location.hash.slice(1);
if (hash && hash in urls) {
  load(hash, urls[hash]);
}
window.addEventListener("hashchange", () => {
  const hash2 = window.location.hash.slice(1);
  if (hash2 && hash2 in urls) {
    load(hash2, urls[hash2]);
  }
});
