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

export { cursor as a, createElement as c };
