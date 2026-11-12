(function () {
  function layoutTreemap(items, width, height) {
    const data = items
      .filter(function (item) { return item.value > 0; })
      .slice()
      .sort(function (a, b) { return b.value - a.value; });
    const rects = [];
    if (!data.length || width <= 0 || height <= 0) return rects;

    function place(list, x, y, w, h) {
      if (!list.length || w <= 0 || h <= 0) return;
      if (list.length === 1) {
        rects.push({ item: list[0], x: x, y: y, w: w, h: h });
        return;
      }
      const total = list.reduce(function (sum, item) { return sum + item.value; }, 0);
      let acc = 0;
      let split = 0;
      while (split < list.length - 1 && acc + list[split].value < total / 2) {
        acc += list[split].value;
        split += 1;
      }
      if (split === 0) split = 1;
      const first = list.slice(0, split);
      const second = list.slice(split);
      const firstValue = first.reduce(function (sum, item) { return sum + item.value; }, 0);
      const fraction = firstValue / total;
      if (w >= h) {
        const widthFirst = w * fraction;
        place(first, x, y, widthFirst, h);
        place(second, x + widthFirst, y, w - widthFirst, h);
      } else {
        const heightFirst = h * fraction;
        place(first, x, y, w, heightFirst);
        place(second, x, y + heightFirst, w, h - heightFirst);
      }
    }

    place(data, 0, 0, width, height);
    return rects;
  }

  const api = typeof window !== "undefined" ? (window.RGP = window.RGP || {}) : {};
  api.layoutTreemap = layoutTreemap;
  if (typeof module !== "undefined" && module.exports) module.exports = { layoutTreemap: layoutTreemap };
})();
