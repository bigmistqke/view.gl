const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/bezier-2tX_q-lx.js","assets/tag-Cg3HhUMF.js","assets/utils-2dzuv_bW.js","assets/game-of-life-DW4xCBuZ.js","assets/glsl-composition-Df2e12PL.js","assets/grid-B3ieCrOd.js","assets/overview-HFgP01nB.js","assets/pix-sim-C-EcMtxW.js","assets/ray-casting-modules-DSpARU0B.js","assets/ray-casting-So5uCMAq.js","assets/sdf-COHRhy61.js","assets/symbol-CUVMT7xc.js","assets/tetris-B2VdbNUC.js"])))=>i.map(i=>d[i]);
import { d as dom } from './utils-2dzuv_bW.js';

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
nav.append(dom("h3", { innerText: "Examples" }));
const urls = Object.fromEntries(
  Object.entries(/* #__PURE__ */ Object.assign({"./examples/bezier.ts": () => __vitePreload(() => import('./bezier-2tX_q-lx.js'),true              ?__vite__mapDeps([0,1,2]):void 0),"./examples/game-of-life.ts": () => __vitePreload(() => import('./game-of-life-DW4xCBuZ.js'),true              ?__vite__mapDeps([3,1,2]):void 0),"./examples/glsl-composition.ts": () => __vitePreload(() => import('./glsl-composition-Df2e12PL.js'),true              ?__vite__mapDeps([4,1,2]):void 0),"./examples/grid.ts": () => __vitePreload(() => import('./grid-B3ieCrOd.js'),true              ?__vite__mapDeps([5,1,2]):void 0),"./examples/overview.ts": () => __vitePreload(() => import('./overview-HFgP01nB.js'),true              ?__vite__mapDeps([6,1]):void 0),"./examples/pix-sim.ts": () => __vitePreload(() => import('./pix-sim-C-EcMtxW.js'),true              ?__vite__mapDeps([7,1,2]):void 0),"./examples/ray-casting-modules.ts": () => __vitePreload(() => import('./ray-casting-modules-DSpARU0B.js'),true              ?__vite__mapDeps([8,1,2]):void 0),"./examples/ray-casting.ts": () => __vitePreload(() => import('./ray-casting-So5uCMAq.js'),true              ?__vite__mapDeps([9,1,2]):void 0),"./examples/sdf.ts": () => __vitePreload(() => import('./sdf-COHRhy61.js'),true              ?__vite__mapDeps([10,1,2]):void 0),"./examples/symbol.ts": () => __vitePreload(() => import('./symbol-CUVMT7xc.js'),true              ?__vite__mapDeps([11,1,2]):void 0),"./examples/tetris.ts": () => __vitePreload(() => import('./tetris-B2VdbNUC.js'),true              ?__vite__mapDeps([12,1]):void 0)})).map(([key, entry]) => {
    const name = key.split("/").pop().replace(".ts", "");
    const chunk = entry.toString().match(/import\(['"]([^'"]+)['"]/)[1];
    return [name, chunk];
  })
);
Object.entries(urls).forEach(([name, localUrl]) => {
  nav.append(
    dom("button", {
      onclick(event) {
        event.preventDefault();
        load(name, localUrl);
      },
      innerHTML: name.replaceAll("-", " "),
      "data-route": name
    })
  );
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
