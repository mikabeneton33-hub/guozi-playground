// 完成時的小慶祝：不放彩帶雨，改成紅色「圈」與「優」印章，克制、像老師批改。
// 尊重 prefers-reduced-motion（減少動態時只顯示、不做動畫）。
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 在指定元素上蓋一個紅色印章。 */
export function stamp(host, text = "優") {
  const s = document.createElement("div");
  s.className = "stamp" + (reduce ? " still" : "");
  s.setAttribute("aria-hidden", "true");
  s.textContent = text;
  host.appendChild(s);
  setTimeout(() => s.remove(), 2600);
}

/** 在方格上畫一個紅圈（老師圈起來的那種）。 */
export function circle(host) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 100 100"); svg.setAttribute("class", "redcircle" + (reduce ? " still" : ""));
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS(ns, "path");
  p.setAttribute("d", "M52 8 C 22 6, 6 30, 9 55 C 12 82, 38 94, 62 90 C 86 86, 96 60, 91 38 C 87 18, 66 8, 40 14");
  p.setAttribute("pathLength", "1");
  svg.appendChild(p); host.appendChild(svg);
  setTimeout(() => svg.remove(), 2400);
}
