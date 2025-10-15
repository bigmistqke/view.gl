const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/bezier-DuLTb2d1.js","assets/tag-C_bg62fD.js","assets/utils-CvCgsM08.js","assets/game_of_life-D7qHdFcv.js","assets/grid-Ie22U_9K.js","assets/overview-DAxtMIw5.js","assets/pix_sim-DIhzM_vu.js","assets/symbol-BouRL-Ni.js","assets/tetris-IMnkSi9p.js"])))=>i.map(i=>d[i]);
import { c as createElement } from './utils-CvCgsM08.js';

const scriptRel = 'modulepreload';const assetsURL = function(dep) { return "https://bigmistqke.github.io/view.gl/"+dep };const seen = {};const __vitePreload = function preload(baseModule, deps, importerUrl) {
	let promise = Promise.resolve();
	if (true               && deps && deps.length > 0) {
		document.getElementsByTagName("link");
		const cspNonceMeta = document.querySelector("meta[property=csp-nonce]");
		const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
		function allSettled(promises$2) {
			return Promise.all(promises$2.map((p$1) => Promise.resolve(p$1).then((value$1) => ({
				status: "fulfilled",
				value: value$1
			}), (reason) => ({
				status: "rejected",
				reason
			}))));
		}
		promise = allSettled(deps.map((dep) => {
			dep = assetsURL(dep);
			if (dep in seen) return;
			seen[dep] = true;
			const isCss = dep.endsWith(".css");
			const cssSelector = isCss ? "[rel=\"stylesheet\"]" : "";
			if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) return;
			const link = document.createElement("link");
			link.rel = isCss ? "stylesheet" : scriptRel;
			if (!isCss) link.as = "script";
			link.crossOrigin = "";
			link.href = dep;
			if (cspNonce) link.setAttribute("nonce", cspNonce);
			document.head.appendChild(link);
			if (isCss) return new Promise((res, rej) => {
				link.addEventListener("load", res);
				link.addEventListener("error", () => rej(/* @__PURE__ */ new Error(`Unable to preload CSS for ${dep}`)));
			});
		}));
	}
	function handlePreloadError(err$2) {
		const e$1 = new Event("vite:preloadError", { cancelable: true });
		e$1.payload = err$2;
		window.dispatchEvent(e$1);
		if (!e$1.defaultPrevented) throw err$2;
	}
	return promise.then((res) => {
		for (const item of res || []) {
			if (item.status !== "rejected") continue;
			handlePreloadError(item.reason);
		}
		return baseModule().catch(handlePreloadError);
	});
};

const css = "https://bigmistqke.github.io/view.gl/assets/index-C2N3u8wj.css";

const iframe = document.querySelector("iframe");
const nav = document.querySelector("nav");
createElement("h3", { innerText: "Examples", parentElement: nav });
const urls = Object.fromEntries(
  Object.entries(/* #__PURE__ */ Object.assign({"./examples/bezier.ts": () => __vitePreload(() => import('./bezier-DuLTb2d1.js'),true              ?__vite__mapDeps([0,1,2]):void 0),"./examples/game_of_life.ts": () => __vitePreload(() => import('./game_of_life-D7qHdFcv.js'),true              ?__vite__mapDeps([3,1]):void 0),"./examples/grid.ts": () => __vitePreload(() => import('./grid-Ie22U_9K.js'),true              ?__vite__mapDeps([4,1,2]):void 0),"./examples/overview.ts": () => __vitePreload(() => import('./overview-DAxtMIw5.js'),true              ?__vite__mapDeps([5,1]):void 0),"./examples/pix_sim.ts": () => __vitePreload(() => import('./pix_sim-DIhzM_vu.js'),true              ?__vite__mapDeps([6,1,2]):void 0),"./examples/symbol.ts": () => __vitePreload(() => import('./symbol-BouRL-Ni.js'),true              ?__vite__mapDeps([7,1,2]):void 0),"./examples/tetris.ts": () => __vitePreload(() => import('./tetris-IMnkSi9p.js'),true              ?__vite__mapDeps([8,1]):void 0)})).map(([key, entry]) => {
    const name = key.split("/").pop().replace(".ts", "");
    const chunk = entry.toString().match(/import\(['"]([^'"]+)['"]/)[1];
    return [name, chunk];
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
