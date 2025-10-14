const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/bezier-CHH1B1ea.js","assets/tag-C_bg62fD.js","assets/game_of_life-D7qHdFcv.js","assets/grid-CRz0h7Cy.js","assets/overview-DAxtMIw5.js","assets/pix_sim-C8eM_ObK.js","assets/symbol-DhRj9Lww.js","assets/tetris-BUgook-1.js"])))=>i.map(i=>d[i]);
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

const scriptRel = 'modulepreload';const assetsURL = function(dep) { return "/"+dep };const seen = {};const __vitePreload = function preload(baseModule, deps, importerUrl) {
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

const css = "/assets/index-C2N3u8wj.css";

function cursor(event, callback) {
  const { promise, resolve } = Promise.withResolvers();
  const controller = new AbortController();
  const initialX = event.clientX;
  const initialY = event.clientY;
  let previousX = event.clientX;
  let previousY = event.clientY;
  window.addEventListener(
    "pointermove",
    (event2) => {
      callback(
        Object.assign(event2, {
          distanceX: initialX - event2.clientX,
          distanceY: initialY - event2.clientY,
          deltaX: previousX - event2.clientX,
          deltaY: previousY - event2.clientY
        })
      );
      previousX = event2.clientX;
      previousY = event2.clientY;
    },
    controller
  );
  window.addEventListener(
    "pointerup",
    () => {
      controller.abort();
      resolve();
    },
    controller
  );
  return promise;
}
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
const modules = /* #__PURE__ */ Object.assign({"./examples/bezier.ts": () => __vitePreload(() => import('./bezier-CHH1B1ea.js'),true              ?__vite__mapDeps([0,1]):void 0),"./examples/game_of_life.ts": () => __vitePreload(() => import('./game_of_life-D7qHdFcv.js'),true              ?__vite__mapDeps([2,1]):void 0),"./examples/grid.ts": () => __vitePreload(() => import('./grid-CRz0h7Cy.js'),true              ?__vite__mapDeps([3,1]):void 0),"./examples/overview.ts": () => __vitePreload(() => import('./overview-DAxtMIw5.js'),true              ?__vite__mapDeps([4,1]):void 0),"./examples/pix_sim.ts": () => __vitePreload(() => import('./pix_sim-C8eM_ObK.js'),true              ?__vite__mapDeps([5,1]):void 0),"./examples/symbol.ts": () => __vitePreload(() => import('./symbol-DhRj9Lww.js'),true              ?__vite__mapDeps([6,1]):void 0),"./examples/tetris.ts": () => __vitePreload(() => import('./tetris-BUgook-1.js'),true              ?__vite__mapDeps([7,1]):void 0)});
Object.keys(modules).forEach((path2) => {
  const name = path2.split("/").pop().replace(".ts", "");
  createElement("button", {
    onclick(event) {
      event.preventDefault();
      load(name, path2);
    },
    innerHTML: name,
    parentElement: nav,
    "data-route": name
  });
});
function load(name, modulePath) {
  history.pushState(name, "", name);
  nav.querySelectorAll("button").forEach((button) => {
    if (button.getAttribute("data-route") === name) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });
  const baseUrl = new URL("./", window.location.href).href;
  const moduleUrl = new URL(modulePath.slice(2), baseUrl).href;
  iframe.src = URL.createObjectURL(
    new Blob(
      [
        `<!DOCTYPE html>
<html>
<head>
<link rel="stylesheet" href="${css}"></link>
<script type="module">
import('${moduleUrl}')
<\/script>
</head>
<body></body>
</html>`
      ],
      {
        type: "text/html"
      }
    )
  );
}
const [, path] = window.location.pathname.split("/");
const examples = Object.keys(modules).map((p) => p.split("/").pop().replace(".ts", ""));
if (path && examples.includes(path)) {
  const modulePath = Object.keys(modules).find((p) => p.includes(path));
  load(path, modulePath);
}

export { cursor as a, createElement as c };
