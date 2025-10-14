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

const __vite_glob_0_0 = "https://bigmistqke.github.io/view.gl/assets/bezier-5-yFAhLY.ts";

const __vite_glob_0_1 = "https://bigmistqke.github.io/view.gl/assets/game_of_life-BXh3ahRX.ts";

const __vite_glob_0_2 = "https://bigmistqke.github.io/view.gl/assets/grid-CezNVJ5a.ts";

const __vite_glob_0_3 = "data:video/mp2t;base64,aW1wb3J0IHsgdmlldyB9IGZyb20gJ3ZpZXcuZ2wnCmltcG9ydCB7IGF0dHJpYnV0ZSwgY29tcGlsZSwgZ2xzbCwgaW50ZXJsZWF2ZSwgdW5pZm9ybSB9IGZyb20gJ3ZpZXcuZ2wvdGFnJwoKY29uc3QgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJykKY2FudmFzLndpZHRoID0gODAwCmNhbnZhcy5oZWlnaHQgPSA2MDAKZG9jdW1lbnQuYm9keS5hcHBlbmQoY2FudmFzKQoKY29uc3QgZ2wgPSBjYW52YXMuZ2V0Q29udGV4dCgnd2ViZ2wyJykhCmdsLnZpZXdwb3J0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCkKCmNvbnN0IHZlcnRleCA9IGdsc2xgCnByZWNpc2lvbiBtZWRpdW1wIGZsb2F0OwoKJHtpbnRlcmxlYXZlKCdpbnN0YW5jZWREYXRhJywgW2F0dHJpYnV0ZS52ZWMyKCdhX3BvcycpLCBhdHRyaWJ1dGUudmVjMygnYV9jb2xvcicpXSwgewogIGluc3RhbmNlZDogdHJ1ZSwKfSl9CiR7YXR0cmlidXRlLnZlYzIoJ2FfdmVydGV4Jyl9CiR7dW5pZm9ybS5mbG9hdCgndV90aW1lJyl9Cgp2YXJ5aW5nIHZlYzMgdl9jb2xvcjsKCnZvaWQgbWFpbigpIHsKICBmbG9hdCBzID0gc2luKHVfdGltZSk7CiAgZmxvYXQgYyA9IGNvcyh1X3RpbWUpOwogIG1hdDIgcm90YXRpb24gPSBtYXQyKAogICAgYywgLXMsCiAgICBzLCAgYwogICk7CiAgdmVjMiBwb3NpdGlvbiA9IGFfcG9zICsgYV92ZXJ0ZXggKiByb3RhdGlvbjsKICBnbF9Qb3NpdGlvbiA9IHZlYzQocG9zaXRpb24sIDAuMCwgIDEuMCk7CgogIHZfY29sb3IgPSBhX2NvbG9yOwp9YAoKY29uc3QgZnJhZ21lbnQgPSBnbHNsYApwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDsKCnZhcnlpbmcgdmVjMyB2X2NvbG9yOwoKdm9pZCBtYWluKCkgewogIGdsX0ZyYWdDb2xvciA9IHZlYzQodl9jb2xvciwgMS4wKTsKfWAKCmNvbnN0IHsgcHJvZ3JhbSwgc2NoZW1hIH0gPSBjb21waWxlKGdsLCB2ZXJ0ZXgsIGZyYWdtZW50KQpjb25zdCB7CiAgYXR0cmlidXRlczogeyBhX3ZlcnRleCB9LAogIHVuaWZvcm1zOiB7IHVfdGltZSB9LAogIGludGVybGVhdmVkQXR0cmlidXRlczogeyBpbnN0YW5jZWREYXRhIH0sCn0gPSB2aWV3KGdsLCBwcm9ncmFtLCBzY2hlbWEpCgovLyBVcGxvYWQgaW50ZXJsZWF2ZWQgYnVmZmVyCmluc3RhbmNlZERhdGEuc2V0KAogIG5ldyBGbG9hdDMyQXJyYXkoCiAgICAoZnVuY3Rpb24qICgpIHsKICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAxMDA7IGkrKykgewogICAgICAgIC8vIFBvc2l0aW9uCiAgICAgICAgeWllbGQgKE1hdGgucmFuZG9tKCkgLSAwLjUpICogMgogICAgICAgIHlpZWxkIChNYXRoLnJhbmRvbSgpIC0gMC41KSAqIDIKCiAgICAgICAgLy8gQ29sb3IKICAgICAgICB5aWVsZCBNYXRoLnJhbmRvbSgpCiAgICAgICAgeWllbGQgTWF0aC5yYW5kb20oKQogICAgICAgIHlpZWxkIE1hdGgucmFuZG9tKCkKICAgICAgfQogICAgfSkoKSwKICApLAopCmluc3RhbmNlZERhdGEuYmluZCgpCgovLyBDcmVhdGUgdHJpYW5nbGUgdmVydGV4IGJ1ZmZlcgphX3ZlcnRleAogIC5zZXQoCiAgICBuZXcgRmxvYXQzMkFycmF5KFsKICAgICAgLy8gdG9wCiAgICAgIDAuMCwgMS4wLAogICAgICAvLyBib3R0b20gbGVmdAogICAgICAtMS4wLCAtMS4wLAogICAgICAvLyBib3R0b20gcmlnaHQKICAgICAgMS4wLCAtMS4wLAogICAgXSksCiAgKQogIC5iaW5kKCkKCmdsLnVzZVByb2dyYW0ocHJvZ3JhbSkKCnJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbiBkcmF3KGRlbHRhOiBudW1iZXIpIHsKICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZHJhdykKCiAgLy8gU2V0IHVuaWZvcm0KICB1X3RpbWUuc2V0KGRlbHRhIC8gMV8wMDApCgogIGdsLmRyYXdBcnJheXNJbnN0YW5jZWQoZ2wuVFJJQU5HTEVTLCAwLCAzLCAxMDApCn0pCg==";

const __vite_glob_0_4 = "https://bigmistqke.github.io/view.gl/assets/pix_sim-e4S36zod.ts";

const __vite_glob_0_5 = "data:video/mp2t;base64,aW1wb3J0IHsgdmlldyB9IGZyb20gJ3ZpZXcuZ2wnCmltcG9ydCB7IGF0dHJpYnV0ZSwgY29tcGlsZSwgZ2xzbCwgdW5pZm9ybSB9IGZyb20gJ3ZpZXcuZ2wvdGFnJwppbXBvcnQgeyBjcmVhdGVFbGVtZW50IH0gZnJvbSAnLi4vdXRpbHMnCgpjb25zdCBjYW52YXMgPSBjcmVhdGVFbGVtZW50KCdjYW52YXMnLCB7CiAgd2lkdGg6IHdpbmRvdy5pbm5lcldpZHRoLAogIGhlaWdodDogd2luZG93LmlubmVySGVpZ2h0LAogIHBhcmVudEVsZW1lbnQ6IGRvY3VtZW50LmJvZHksCiAgc3R5bGU6ICd3aWR0aDogMTAwJTsgaGVpZ2h0OiAxMDAlJywKfSkKCm5ldyBSZXNpemVPYnNlcnZlcigoKSA9PiB7CiAgY2FudmFzLndpZHRoID0gd2luZG93LmlubmVyV2lkdGgKICBjYW52YXMuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0CiAgZ2wudmlld3BvcnQoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KQogIGRyYXcocGVyZm9ybWFuY2Uubm93KCkpCn0pLm9ic2VydmUoY2FudmFzKQoKY29uc3QgZ2wgPSBjYW52YXMuZ2V0Q29udGV4dCgnd2ViZ2wyJykhCmdsLnZpZXdwb3J0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCkKCmNvbnN0IHZlcnRleCA9IGdsc2xgCnByZWNpc2lvbiBtZWRpdW1wIGZsb2F0OwoKJHthdHRyaWJ1dGUudmVjMignYV92ZXJ0ZXgnKX0KJHt1bmlmb3JtLmZsb2F0KCd1X3RpbWUnKX0KCnZvaWQgbWFpbigpIHsKICBmbG9hdCBzID0gc2luKHVfdGltZSk7CiAgZmxvYXQgYyA9IGNvcyh1X3RpbWUpOwogIG1hdDIgcm90YXRpb24gPSBtYXQyKAogICAgYywgLXMsCiAgICBzLCAgYwogICk7CiAgdmVjMiBwb3NpdGlvbiA9IGFfdmVydGV4ICogcm90YXRpb247CiAgZ2xfUG9zaXRpb24gPSB2ZWM0KHBvc2l0aW9uLCAwLjAsICAxLjApOwp9YAoKY29uc3QgdV9jb2xvciA9IFN5bWJvbCgnY29sb3InKQoKY29uc3QgZnJhZ21lbnQgPSBnbHNsYApwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDsKCiR7dW5pZm9ybS52ZWMzKHVfY29sb3IpfQoKdm9pZCBtYWluKCkgewogIGdsX0ZyYWdDb2xvciA9IHZlYzQoJHt1X2NvbG9yfSwgMS4wKTsKfWAKCmNvbnN0IHsgcHJvZ3JhbSwgc2NoZW1hIH0gPSBjb21waWxlKGdsLCB2ZXJ0ZXgsIGZyYWdtZW50KQpjb25zdCB7IGF0dHJpYnV0ZXMsIHVuaWZvcm1zIH0gPSB2aWV3KGdsLCBwcm9ncmFtLCBzY2hlbWEpCgpnbC51c2VQcm9ncmFtKHByb2dyYW0pCgp1bmlmb3Jtc1t1X2NvbG9yXS5zZXQoMCwgMjU1LCAwKQoKLy8gQ3JlYXRlIHRyaWFuZ2xlIHZlcnRleCBidWZmZXIKYXR0cmlidXRlcy5hX3ZlcnRleAogIC5zZXQoCiAgICBuZXcgRmxvYXQzMkFycmF5KFsKICAgICAgLy8gdG9wCiAgICAgIDAuMCwgMS4wLAogICAgICAvLyBib3R0b20gbGVmdAogICAgICAtMS4wLCAtMS4wLAogICAgICAvLyBib3R0b20gcmlnaHQKICAgICAgMS4wLCAtMS4wLAogICAgXSksCiAgKQogIC5iaW5kKCkKCmZ1bmN0aW9uIGRyYXcoZGVsdGE6IG51bWJlcikgewogIHJlcXVlc3RBbmltYXRpb25GcmFtZShkcmF3KQoKICAvLyBTZXQgdW5pZm9ybQogIHVuaWZvcm1zLnVfdGltZS5zZXQoZGVsdGEgLyAxXzAwMCkKCiAgZ2wuZHJhd0FycmF5c0luc3RhbmNlZChnbC5UUklBTkdMRVMsIDAsIDMsIDEwMCkKfQpyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZHJhdykK";

const __vite_glob_0_6 = "https://bigmistqke.github.io/view.gl/assets/tetris-DTN16P8_.ts";

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
const urls = Object.fromEntries(
  Object.entries(
    /* #__PURE__ */ Object.assign({"./examples/bezier.ts": __vite_glob_0_0,"./examples/game_of_life.ts": __vite_glob_0_1,"./examples/grid.ts": __vite_glob_0_2,"./examples/overview.ts": __vite_glob_0_3,"./examples/pix_sim.ts": __vite_glob_0_4,"./examples/symbol.ts": __vite_glob_0_5,"./examples/tetris.ts": __vite_glob_0_6})
  ).map(([key, entry]) => {
    return [key.split("/").pop().replace(".ts", ""), entry];
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
  history.pushState(url, "", name);
  URL.revokeObjectURL(iframe.src);
  nav.querySelectorAll("a").forEach((button) => {
    console.log(button);
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
<link rel="stylesheet" href="${css}"></link>
<script type="module" src="${url}"><\/script></head>`
      ],
      {
        type: "text/html"
      }
    )
  );
}
const [, path, ...rest] = window.location.pathname.split("/");
if (path && path in urls) {
  load(path, urls[path]);
}
