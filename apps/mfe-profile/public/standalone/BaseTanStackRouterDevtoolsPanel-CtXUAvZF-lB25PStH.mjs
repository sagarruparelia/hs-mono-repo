import { c as K, a as Oe, e as y, u as at, k as ht, l as pt, n as $t, b as G, t as E, s as st, m as je, i as u, o as mt, f as l, d as S, p as L, M as Pe, r as he, j as ne, F as bt, S as yt, q as tt, v as xt, w as wt, x as Ct, y as lt, z as He } from "./ce-BiuyNc-V.mjs";
function dt(r) {
  var e, n, t = "";
  if (typeof r == "string" || typeof r == "number") t += r;
  else if (typeof r == "object") if (Array.isArray(r)) {
    var f = r.length;
    for (e = 0; e < f; e++) r[e] && (n = dt(r[e])) && (t && (t += " "), t += n);
  } else for (n in r) r[n] && (t && (t += " "), t += n);
  return t;
}
function R() {
  for (var r, e, n = 0, t = "", f = arguments.length; n < f; n++) (r = arguments[n]) && (e = dt(r)) && (t && (t += " "), t += e);
  return t;
}
let kt = { data: "" }, _t = (r) => {
  if (typeof window == "object") {
    let e = (r ? r.querySelector("#_goober") : window._goober) || Object.assign(document.createElement("style"), { innerHTML: " ", id: "_goober" });
    return e.nonce = window.__nonce__, e.parentNode || (r || document.head).appendChild(e), e.firstChild;
  }
  return r || kt;
}, St = /(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g, Ft = /\/\*[^]*?\*\/|  +/g, rt = /\n+/g, re = (r, e) => {
  let n = "", t = "", f = "";
  for (let a in r) {
    let s = r[a];
    a[0] == "@" ? a[1] == "i" ? n = a + " " + s + ";" : t += a[1] == "f" ? re(s, a) : a + "{" + re(s, a[1] == "k" ? "" : e) + "}" : typeof s == "object" ? t += re(s, e ? e.replace(/([^,])+/g, (c) => a.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g, (g) => /&/.test(g) ? g.replace(/&/g, c) : c ? c + " " + g : g)) : a) : s != null && (a = /^--/.test(a) ? a : a.replace(/[A-Z]/g, "-$&").toLowerCase(), f += re.p ? re.p(a, s) : a + ":" + s + ";");
  }
  return n + (e && f ? e + "{" + f + "}" : f) + t;
}, X = {}, ct = (r) => {
  if (typeof r == "object") {
    let e = "";
    for (let n in r) e += n + ct(r[n]);
    return e;
  }
  return r;
}, zt = (r, e, n, t, f) => {
  let a = ct(r), s = X[a] || (X[a] = ((g) => {
    let o = 0, i = 11;
    for (; o < g.length; ) i = 101 * i + g.charCodeAt(o++) >>> 0;
    return "go" + i;
  })(a));
  if (!X[s]) {
    let g = a !== r ? r : ((o) => {
      let i, v, h = [{}];
      for (; i = St.exec(o.replace(Ft, "")); ) i[4] ? h.shift() : i[3] ? (v = i[3].replace(rt, " ").trim(), h.unshift(h[0][v] = h[0][v] || {})) : h[0][i[1]] = i[2].replace(rt, " ").trim();
      return h[0];
    })(r);
    X[s] = re(f ? { ["@keyframes " + s]: g } : g, n ? "" : "." + s);
  }
  let c = n && X.g ? X.g : null;
  return n && (X.g = X[s]), ((g, o, i, v) => {
    v ? o.data = o.data.replace(v, g) : o.data.indexOf(g) === -1 && (o.data = i ? g + o.data : o.data + g);
  })(X[s], e, t, c), s;
}, Dt = (r, e, n) => r.reduce((t, f, a) => {
  let s = e[a];
  if (s && s.call) {
    let c = s(n), g = c && c.props && c.props.className || /^go/.test(c) && c;
    s = g ? "." + g : c && typeof c == "object" ? c.props ? "" : re(c, "") : c === !1 ? "" : c;
  }
  return t + f + (s ?? "");
}, "");
function ae(r) {
  let e = this || {}, n = r.call ? r(e.p) : r;
  return zt(n.unshift ? n.raw ? Dt(n, [].slice.call(arguments, 1), e.p) : n.reduce((t, f) => Object.assign(t, f && f.call ? f(e.p) : f), {}) : n, _t(e.target), e.g, e.o, e.k);
}
ae.bind({ g: 1 });
ae.bind({ k: 1 });
const Bt = typeof window > "u";
function Ae(r) {
  const e = {
    pending: "yellow",
    success: "green",
    error: "red",
    notFound: "purple",
    redirected: "gray"
  };
  return r.isFetching && r.status === "success" ? r.isFetching === "beforeLoad" ? "purple" : "blue" : e[r.status];
}
function It(r, e) {
  const n = r.find((t) => t.routeId === e.id);
  return n ? Ae(n) : "gray";
}
function Et() {
  const [r, e] = K(!1);
  return (Bt ? Oe : y)(() => {
    e(!0);
  }), r;
}
const Tt = (r) => {
  const e = Object.getOwnPropertyNames(Object(r)), n = typeof r == "bigint" ? `${r.toString()}n` : r;
  try {
    return JSON.stringify(n, e);
  } catch {
    return "unable to stringify";
  }
};
function Pt(r, e = [(n) => n]) {
  return r.map((n, t) => [n, t]).sort(([n, t], [f, a]) => {
    for (const s of e) {
      const c = s(n), g = s(f);
      if (typeof c > "u") {
        if (typeof g > "u")
          continue;
        return 1;
      }
      if (c !== g)
        return c > g ? 1 : -1;
    }
    return t - a;
  }).map(([n]) => n);
}
const I = {
  colors: {
    inherit: "inherit",
    current: "currentColor",
    transparent: "transparent",
    black: "#000000",
    white: "#ffffff",
    neutral: {
      50: "#f9fafb",
      100: "#f2f4f7",
      200: "#eaecf0",
      300: "#d0d5dd",
      400: "#98a2b3",
      500: "#667085",
      600: "#475467",
      700: "#344054",
      800: "#1d2939",
      900: "#101828"
    },
    darkGray: {
      50: "#525c7a",
      100: "#49536e",
      200: "#414962",
      300: "#394056",
      400: "#313749",
      500: "#292e3d",
      600: "#212530",
      700: "#191c24",
      800: "#111318",
      900: "#0b0d10"
    },
    gray: {
      50: "#f9fafb",
      100: "#f2f4f7",
      200: "#eaecf0",
      300: "#d0d5dd",
      400: "#98a2b3",
      500: "#667085",
      600: "#475467",
      700: "#344054",
      800: "#1d2939",
      900: "#101828"
    },
    blue: {
      25: "#F5FAFF",
      50: "#EFF8FF",
      100: "#D1E9FF",
      200: "#B2DDFF",
      300: "#84CAFF",
      400: "#53B1FD",
      500: "#2E90FA",
      600: "#1570EF",
      700: "#175CD3",
      800: "#1849A9",
      900: "#194185"
    },
    green: {
      25: "#F6FEF9",
      50: "#ECFDF3",
      100: "#D1FADF",
      200: "#A6F4C5",
      300: "#6CE9A6",
      400: "#32D583",
      500: "#12B76A",
      600: "#039855",
      700: "#027A48",
      800: "#05603A",
      900: "#054F31"
    },
    red: {
      50: "#fef2f2",
      100: "#fee2e2",
      200: "#fecaca",
      300: "#fca5a5",
      400: "#f87171",
      500: "#ef4444",
      600: "#dc2626",
      700: "#b91c1c",
      800: "#991b1b",
      900: "#7f1d1d",
      950: "#450a0a"
    },
    yellow: {
      25: "#FFFCF5",
      50: "#FFFAEB",
      100: "#FEF0C7",
      200: "#FEDF89",
      300: "#FEC84B",
      400: "#FDB022",
      500: "#F79009",
      600: "#DC6803",
      700: "#B54708",
      800: "#93370D",
      900: "#7A2E0E"
    },
    purple: {
      25: "#FAFAFF",
      50: "#F4F3FF",
      100: "#EBE9FE",
      200: "#D9D6FE",
      300: "#BDB4FE",
      400: "#9B8AFB",
      500: "#7A5AF8",
      600: "#6938EF",
      700: "#5925DC",
      800: "#4A1FB8",
      900: "#3E1C96"
    },
    teal: {
      25: "#F6FEFC",
      50: "#F0FDF9",
      100: "#CCFBEF",
      200: "#99F6E0",
      300: "#5FE9D0",
      400: "#2ED3B7",
      500: "#15B79E",
      600: "#0E9384",
      700: "#107569",
      800: "#125D56",
      900: "#134E48"
    },
    pink: {
      25: "#fdf2f8",
      50: "#fce7f3",
      100: "#fbcfe8",
      200: "#f9a8d4",
      300: "#f472b6",
      400: "#ec4899",
      500: "#db2777",
      600: "#be185d",
      700: "#9d174d",
      800: "#831843",
      900: "#500724"
    },
    cyan: {
      25: "#ecfeff",
      50: "#cffafe",
      100: "#a5f3fc",
      200: "#67e8f9",
      300: "#22d3ee",
      400: "#06b6d4",
      500: "#0891b2",
      600: "#0e7490",
      700: "#155e75",
      800: "#164e63",
      900: "#083344"
    }
  },
  alpha: {
    90: "e5",
    70: "b3",
    20: "33"
  },
  font: {
    size: {
      "2xs": "calc(var(--tsrd-font-size) * 0.625)",
      xs: "calc(var(--tsrd-font-size) * 0.75)",
      sm: "calc(var(--tsrd-font-size) * 0.875)",
      md: "var(--tsrd-font-size)"
    },
    lineHeight: {
      xs: "calc(var(--tsrd-font-size) * 1)",
      sm: "calc(var(--tsrd-font-size) * 1.25)"
    },
    weight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700"
    },
    fontFamily: {
      sans: "ui-sans-serif, Inter, system-ui, sans-serif, sans-serif",
      mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
    }
  },
  border: {
    radius: {
      xs: "calc(var(--tsrd-font-size) * 0.125)",
      sm: "calc(var(--tsrd-font-size) * 0.25)",
      md: "calc(var(--tsrd-font-size) * 0.375)",
      full: "9999px"
    }
  },
  size: {
    0: "0px",
    0.5: "calc(var(--tsrd-font-size) * 0.125)",
    1: "calc(var(--tsrd-font-size) * 0.25)",
    1.5: "calc(var(--tsrd-font-size) * 0.375)",
    2: "calc(var(--tsrd-font-size) * 0.5)",
    2.5: "calc(var(--tsrd-font-size) * 0.625)",
    3: "calc(var(--tsrd-font-size) * 0.75)",
    3.5: "calc(var(--tsrd-font-size) * 0.875)",
    4: "calc(var(--tsrd-font-size) * 1)",
    5: "calc(var(--tsrd-font-size) * 1.25)",
    8: "calc(var(--tsrd-font-size) * 2)"
  }
}, Mt = (r) => {
  const {
    colors: e,
    font: n,
    size: t,
    alpha: f,
    border: a
  } = I, {
    fontFamily: s,
    lineHeight: c,
    size: g
  } = n, o = r ? ae.bind({
    target: r
  }) : ae;
  return {
    devtoolsPanelContainer: o`
      direction: ltr;
      position: fixed;
      bottom: 0;
      right: 0;
      z-index: 99999;
      width: 100%;
      max-height: 90%;
      border-top: 1px solid ${e.gray[700]};
      transform-origin: top;
    `,
    devtoolsPanelContainerVisibility: (i) => o`
        visibility: ${i ? "visible" : "hidden"};
      `,
    devtoolsPanelContainerResizing: (i) => i() ? o`
          transition: none;
        ` : o`
        transition: all 0.4s ease;
      `,
    devtoolsPanelContainerAnimation: (i, v) => i ? o`
          pointer-events: auto;
          transform: translateY(0);
        ` : o`
        pointer-events: none;
        transform: translateY(${v}px);
      `,
    logo: o`
      cursor: pointer;
      display: flex;
      flex-direction: column;
      background-color: transparent;
      border: none;
      font-family: ${s.sans};
      gap: ${I.size[0.5]};
      padding: 0px;
      &:hover {
        opacity: 0.7;
      }
      &:focus-visible {
        outline-offset: 4px;
        border-radius: ${a.radius.xs};
        outline: 2px solid ${e.blue[800]};
      }
    `,
    tanstackLogo: o`
      font-size: ${n.size.md};
      font-weight: ${n.weight.bold};
      line-height: ${n.lineHeight.xs};
      white-space: nowrap;
      color: ${e.gray[300]};
    `,
    routerLogo: o`
      font-weight: ${n.weight.semibold};
      font-size: ${n.size.xs};
      background: linear-gradient(to right, #84cc16, #10b981);
      background-clip: text;
      -webkit-background-clip: text;
      line-height: 1;
      -webkit-text-fill-color: transparent;
      white-space: nowrap;
    `,
    devtoolsPanel: o`
      display: flex;
      font-size: ${g.sm};
      font-family: ${s.sans};
      background-color: ${e.darkGray[700]};
      color: ${e.gray[300]};

      @media (max-width: 700px) {
        flex-direction: column;
      }
      @media (max-width: 600px) {
        font-size: ${g.xs};
      }
    `,
    dragHandle: o`
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 4px;
      cursor: row-resize;
      z-index: 100000;
      &:hover {
        background-color: ${e.purple[400]}${f[90]};
      }
    `,
    firstContainer: o`
      flex: 1 1 500px;
      min-height: 40%;
      max-height: 100%;
      overflow: auto;
      border-right: 1px solid ${e.gray[700]};
      display: flex;
      flex-direction: column;
    `,
    routerExplorerContainer: o`
      overflow-y: auto;
      flex: 1;
    `,
    routerExplorer: o`
      padding: ${I.size[2]};
    `,
    row: o`
      display: flex;
      align-items: center;
      padding: ${I.size[2]} ${I.size[2.5]};
      gap: ${I.size[2.5]};
      border-bottom: ${e.darkGray[500]} 1px solid;
      align-items: center;
    `,
    detailsHeader: o`
      font-family: ui-sans-serif, Inter, system-ui, sans-serif, sans-serif;
      position: sticky;
      top: 0;
      z-index: 2;
      background-color: ${e.darkGray[600]};
      padding: 0px ${I.size[2]};
      font-weight: ${n.weight.medium};
      font-size: ${n.size.xs};
      min-height: ${I.size[8]};
      line-height: ${n.lineHeight.xs};
      text-align: left;
      display: flex;
      align-items: center;
    `,
    maskedBadge: o`
      background: ${e.yellow[900]}${f[70]};
      color: ${e.yellow[300]};
      display: inline-block;
      padding: ${I.size[0]} ${I.size[2.5]};
      border-radius: ${a.radius.full};
      font-size: ${n.size.xs};
      font-weight: ${n.weight.normal};
      border: 1px solid ${e.yellow[300]};
    `,
    maskedLocation: o`
      color: ${e.yellow[300]};
    `,
    detailsContent: o`
      padding: ${I.size[1.5]} ${I.size[2]};
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: ${n.size.xs};
    `,
    routeMatchesToggle: o`
      display: flex;
      align-items: center;
      border: 1px solid ${e.gray[500]};
      border-radius: ${a.radius.sm};
      overflow: hidden;
    `,
    routeMatchesToggleBtn: (i, v) => {
      const _ = [o`
        appearance: none;
        border: none;
        font-size: 12px;
        padding: 4px 8px;
        background: transparent;
        cursor: pointer;
        font-family: ${s.sans};
        font-weight: ${n.weight.medium};
      `];
      if (i) {
        const m = o`
          background: ${e.darkGray[400]};
          color: ${e.gray[300]};
        `;
        _.push(m);
      } else {
        const m = o`
          color: ${e.gray[500]};
          background: ${e.darkGray[800]}${f[20]};
        `;
        _.push(m);
      }
      return v && _.push(o`
          border-right: 1px solid ${I.colors.gray[500]};
        `), _;
    },
    detailsHeaderInfo: o`
      flex: 1;
      justify-content: flex-end;
      display: flex;
      align-items: center;
      font-weight: ${n.weight.normal};
      color: ${e.gray[400]};
    `,
    matchRow: (i) => {
      const h = [o`
        display: flex;
        border-bottom: 1px solid ${e.darkGray[400]};
        cursor: pointer;
        align-items: center;
        padding: ${t[1]} ${t[2]};
        gap: ${t[2]};
        font-size: ${g.xs};
        color: ${e.gray[300]};
      `];
      if (i) {
        const _ = o`
          background: ${e.darkGray[500]};
        `;
        h.push(_);
      }
      return h;
    },
    matchIndicator: (i) => {
      const h = [o`
        flex: 0 0 auto;
        width: ${t[3]};
        height: ${t[3]};
        background: ${e[i][900]};
        border: 1px solid ${e[i][500]};
        border-radius: ${a.radius.full};
        transition: all 0.25s ease-out;
        box-sizing: border-box;
      `];
      if (i === "gray") {
        const _ = o`
          background: ${e.gray[700]};
          border-color: ${e.gray[400]};
        `;
        h.push(_);
      }
      return h;
    },
    matchID: o`
      flex: 1;
      line-height: ${c.xs};
    `,
    ageTicker: (i) => {
      const h = [o`
        display: flex;
        gap: ${t[1]};
        font-size: ${g.xs};
        color: ${e.gray[400]};
        font-variant-numeric: tabular-nums;
        line-height: ${c.xs};
      `];
      if (i) {
        const _ = o`
          color: ${e.yellow[400]};
        `;
        h.push(_);
      }
      return h;
    },
    secondContainer: o`
      flex: 1 1 500px;
      min-height: 40%;
      max-height: 100%;
      overflow: auto;
      border-right: 1px solid ${e.gray[700]};
      display: flex;
      flex-direction: column;
    `,
    thirdContainer: o`
      flex: 1 1 500px;
      overflow: auto;
      display: flex;
      flex-direction: column;
      height: 100%;
      border-right: 1px solid ${e.gray[700]};

      @media (max-width: 700px) {
        border-top: 2px solid ${e.gray[700]};
      }
    `,
    fourthContainer: o`
      flex: 1 1 500px;
      min-height: 40%;
      max-height: 100%;
      overflow: auto;
      display: flex;
      flex-direction: column;
    `,
    routesContainer: o`
      overflow-x: auto;
      overflow-y: visible;
    `,
    routesRowContainer: (i, v) => {
      const _ = [o`
        display: flex;
        border-bottom: 1px solid ${e.darkGray[400]};
        align-items: center;
        padding: ${t[1]} ${t[2]};
        gap: ${t[2]};
        font-size: ${g.xs};
        color: ${e.gray[300]};
        cursor: ${v ? "pointer" : "default"};
        line-height: ${c.xs};
      `];
      if (i) {
        const m = o`
          background: ${e.darkGray[500]};
        `;
        _.push(m);
      }
      return _;
    },
    routesRow: (i) => {
      const h = [o`
        flex: 1 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: ${g.xs};
        line-height: ${c.xs};
      `];
      if (!i) {
        const _ = o`
          color: ${e.gray[400]};
        `;
        h.push(_);
      }
      return h;
    },
    routesRowInner: o`
      display: 'flex';
      align-items: 'center';
      flex-grow: 1;
      min-width: 0;
    `,
    routeParamInfo: o`
      color: ${e.gray[400]};
      font-size: ${g.xs};
      line-height: ${c.xs};
    `,
    nestedRouteRow: (i) => o`
        margin-left: ${i ? 0 : t[3.5]};
        border-left: ${i ? "" : `solid 1px ${e.gray[700]}`};
      `,
    code: o`
      font-size: ${g.xs};
      line-height: ${c.xs};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `,
    matchesContainer: o`
      flex: 1 1 auto;
      overflow-y: auto;
    `,
    cachedMatchesContainer: o`
      flex: 1 1 auto;
      overflow-y: auto;
      max-height: 50%;
    `,
    historyContainer: o`
      display: flex;
      flex: 1 1 auto;
      overflow-y: auto;
      max-height: 50%;
    `,
    historyOverflowContainer: o`
      padding: ${t[1]} ${t[2]};
      font-size: ${I.font.size.xs};
    `,
    maskedBadgeContainer: o`
      flex: 1;
      justify-content: flex-end;
      display: flex;
    `,
    matchDetails: o`
      display: flex;
      flex-direction: column;
      padding: ${I.size[2]};
      font-size: ${I.font.size.xs};
      color: ${I.colors.gray[300]};
      line-height: ${I.font.lineHeight.sm};
    `,
    matchStatus: (i, v) => {
      const _ = v && i === "success" ? v === "beforeLoad" ? "purple" : "blue" : {
        pending: "yellow",
        success: "green",
        error: "red",
        notFound: "purple",
        redirected: "gray"
      }[i];
      return o`
        display: flex;
        justify-content: center;
        align-items: center;
        height: 40px;
        border-radius: ${I.border.radius.sm};
        font-weight: ${I.font.weight.normal};
        background-color: ${I.colors[_][900]}${I.alpha[90]};
        color: ${I.colors[_][300]};
        border: 1px solid ${I.colors[_][600]};
        margin-bottom: ${I.size[2]};
        transition: all 0.25s ease-out;
      `;
    },
    matchDetailsInfo: o`
      display: flex;
      justify-content: flex-end;
      flex: 1;
    `,
    matchDetailsInfoLabel: o`
      display: flex;
    `,
    mainCloseBtn: o`
      background: ${e.darkGray[700]};
      padding: ${t[1]} ${t[2]} ${t[1]} ${t[1.5]};
      border-radius: ${a.radius.md};
      position: fixed;
      z-index: 99999;
      display: inline-flex;
      width: fit-content;
      cursor: pointer;
      appearance: none;
      border: 0;
      gap: 8px;
      align-items: center;
      border: 1px solid ${e.gray[500]};
      font-size: ${n.size.xs};
      cursor: pointer;
      transition: all 0.25s ease-out;

      &:hover {
        background: ${e.darkGray[500]};
      }
    `,
    mainCloseBtnPosition: (i) => o`
        ${i === "top-left" ? `top: ${t[2]}; left: ${t[2]};` : ""}
        ${i === "top-right" ? `top: ${t[2]}; right: ${t[2]};` : ""}
        ${i === "bottom-left" ? `bottom: ${t[2]}; left: ${t[2]};` : ""}
        ${i === "bottom-right" ? `bottom: ${t[2]}; right: ${t[2]};` : ""}
      `,
    mainCloseBtnAnimation: (i) => i ? o`
        opacity: 0;
        pointer-events: none;
        visibility: hidden;
      ` : o`
          opacity: 1;
          pointer-events: auto;
          visibility: visible;
        `,
    routerLogoCloseButton: o`
      font-weight: ${n.weight.semibold};
      font-size: ${n.size.xs};
      background: linear-gradient(to right, #98f30c, #00f4a3);
      background-clip: text;
      -webkit-background-clip: text;
      line-height: 1;
      -webkit-text-fill-color: transparent;
      white-space: nowrap;
    `,
    mainCloseBtnDivider: o`
      width: 1px;
      background: ${I.colors.gray[600]};
      height: 100%;
      border-radius: 999999px;
      color: transparent;
    `,
    mainCloseBtnIconContainer: o`
      position: relative;
      width: ${t[5]};
      height: ${t[5]};
      background: pink;
      border-radius: 999999px;
      overflow: hidden;
    `,
    mainCloseBtnIconOuter: o`
      width: ${t[5]};
      height: ${t[5]};
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      filter: blur(3px) saturate(1.8) contrast(2);
    `,
    mainCloseBtnIconInner: o`
      width: ${t[4]};
      height: ${t[4]};
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `,
    panelCloseBtn: o`
      position: absolute;
      cursor: pointer;
      z-index: 100001;
      display: flex;
      align-items: center;
      justify-content: center;
      outline: none;
      background-color: ${e.darkGray[700]};
      &:hover {
        background-color: ${e.darkGray[500]};
      }

      top: 0;
      right: ${t[2]};
      transform: translate(0, -100%);
      border-right: ${e.darkGray[300]} 1px solid;
      border-left: ${e.darkGray[300]} 1px solid;
      border-top: ${e.darkGray[300]} 1px solid;
      border-bottom: none;
      border-radius: ${a.radius.sm} ${a.radius.sm} 0px 0px;
      padding: ${t[1]} ${t[1.5]} ${t[0.5]} ${t[1.5]};

      &::after {
        content: ' ';
        position: absolute;
        top: 100%;
        left: -${t[2.5]};
        height: ${t[1.5]};
        width: calc(100% + ${t[5]});
      }
    `,
    panelCloseBtnIcon: o`
      color: ${e.gray[400]};
      width: ${t[2]};
      height: ${t[2]};
    `,
    navigateButton: o`
      background: none;
      border: none;
      padding: 0 0 0 4px;
      margin: 0;
      color: ${e.gray[400]};
      font-size: ${g.md};
      cursor: pointer;
      line-height: 1;
      vertical-align: middle;
      margin-right: 0.5ch;
      flex-shrink: 0;
      &:hover {
        color: ${e.blue[300]};
      }
    `
  };
};
function se() {
  const r = at(lt), [e] = K(Mt(r));
  return e;
}
const At = (r) => {
  try {
    const e = localStorage.getItem(r);
    return typeof e == "string" ? JSON.parse(e) : void 0;
  } catch {
    return;
  }
};
function Re(r, e) {
  const [n, t] = K();
  return Oe(() => {
    const a = At(r);
    t(
      typeof a > "u" || a === null ? typeof e == "function" ? e() : e : a
    );
  }), [n, (a) => {
    t((s) => {
      let c = a;
      typeof a == "function" && (c = a(s));
      try {
        localStorage.setItem(r, JSON.stringify(c));
      } catch {
      }
      return c;
    });
  }];
}
var Rt = /* @__PURE__ */ E('<span><svg xmlns=http://www.w3.org/2000/svg width=12 height=12 fill=none viewBox="0 0 24 24"><path stroke=currentColor stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 18l6-6-6-6">'), ke = /* @__PURE__ */ E("<div>"), Lt = /* @__PURE__ */ E("<button><span> "), Ot = /* @__PURE__ */ E("<div><div><button> [<!> ... <!>]"), jt = /* @__PURE__ */ E("<button><span></span> 🔄 "), Ht = /* @__PURE__ */ E("<span>:"), Nt = /* @__PURE__ */ E("<span>");
const nt = ({
  expanded: r,
  style: e = {}
}) => {
  const n = ut();
  return (() => {
    var t = Rt(), f = t.firstChild;
    return y((a) => {
      var s = n().expander, c = R(n().expanderIcon(r));
      return s !== a.e && l(t, a.e = s), c !== a.t && ne(f, "class", a.t = c), a;
    }, {
      e: void 0,
      t: void 0
    }), t;
  })();
};
function Gt(r, e) {
  if (e < 1) return [];
  let n = 0;
  const t = [];
  for (; n < r.length; )
    t.push(r.slice(n, n + e)), n = n + e;
  return t;
}
function Vt(r) {
  return Symbol.iterator in r;
}
function oe({
  value: r,
  defaultExpanded: e,
  pageSize: n = 100,
  filterSubEntries: t,
  ...f
}) {
  const [a, s] = K(!!e), c = () => s((O) => !O), g = G(() => typeof r()), o = G(() => {
    let O = [];
    const Q = (F) => {
      const x = e === !0 ? {
        [F.label]: !0
      } : e?.[F.label];
      return {
        ...F,
        value: () => F.value,
        defaultExpanded: x
      };
    };
    return Array.isArray(r()) ? O = r().map((F, x) => Q({
      label: x.toString(),
      value: F
    })) : r() !== null && typeof r() == "object" && Vt(r()) && typeof r()[Symbol.iterator] == "function" ? O = Array.from(r(), (F, x) => Q({
      label: x.toString(),
      value: F
    })) : typeof r() == "object" && r() !== null && (O = Object.entries(r()).map(([F, x]) => Q({
      label: F,
      value: x
    }))), t ? t(O) : O;
  }), i = G(() => Gt(o(), n)), [v, h] = K([]), [_, m] = K(void 0), P = ut(), N = () => {
    m(r()());
  }, U = (O) => S(oe, je({
    value: r,
    filterSubEntries: t
  }, f, O));
  return (() => {
    var O = ke();
    return u(O, (() => {
      var Q = L(() => !!i().length);
      return () => Q() ? [(() => {
        var F = Lt(), x = F.firstChild, w = x.firstChild;
        return F.$$click = () => c(), u(F, S(nt, {
          get expanded() {
            return a() ?? !1;
          }
        }), x), u(F, () => f.label, x), u(x, () => String(g).toLowerCase() === "iterable" ? "(Iterable) " : "", w), u(x, () => o().length, w), u(x, () => o().length > 1 ? "items" : "item", null), y((q) => {
          var W = P().expandButton, Y = P().info;
          return W !== q.e && l(F, q.e = W), Y !== q.t && l(x, q.t = Y), q;
        }, {
          e: void 0,
          t: void 0
        }), F;
      })(), L(() => L(() => !!(a() ?? !1))() ? L(() => i().length === 1)() ? (() => {
        var F = ke();
        return u(F, () => o().map((x, w) => U(x))), y(() => l(F, P().subEntries)), F;
      })() : (() => {
        var F = ke();
        return u(F, () => i().map((x, w) => (() => {
          var q = Ot(), W = q.firstChild, Y = W.firstChild, le = Y.firstChild, $e = le.nextSibling, De = $e.nextSibling, M = De.nextSibling;
          return M.nextSibling, Y.$$click = () => h((D) => D.includes(w) ? D.filter((V) => V !== w) : [...D, w]), u(Y, S(nt, {
            get expanded() {
              return v().includes(w);
            }
          }), le), u(Y, w * n, $e), u(Y, w * n + n - 1, M), u(W, (() => {
            var D = L(() => !!v().includes(w));
            return () => D() ? (() => {
              var V = ke();
              return u(V, () => x.map((J) => U(J))), y(() => l(V, P().subEntries)), V;
            })() : null;
          })(), null), y((D) => {
            var V = P().entry, J = R(P().labelButton, "labelButton");
            return V !== D.e && l(W, D.e = V), J !== D.t && l(Y, D.t = J), D;
          }, {
            e: void 0,
            t: void 0
          }), q;
        })())), y(() => l(F, P().subEntries)), F;
      })() : null)] : (() => {
        var F = L(() => g() === "function");
        return () => F() ? S(oe, {
          get label() {
            return (() => {
              var x = jt(), w = x.firstChild;
              return x.$$click = N, u(w, () => f.label), y(() => l(x, P().refreshValueBtn)), x;
            })();
          },
          value: _,
          defaultExpanded: {}
        }) : [(() => {
          var x = Ht(), w = x.firstChild;
          return u(x, () => f.label, w), x;
        })(), " ", (() => {
          var x = Nt();
          return u(x, () => Tt(r())), y(() => l(x, P().value)), x;
        })()];
      })();
    })()), y(() => l(O, P().entry)), O;
  })();
}
const Jt = (r) => {
  const {
    colors: e,
    font: n,
    size: t
  } = I, {
    fontFamily: f,
    lineHeight: a,
    size: s
  } = n, c = r ? ae.bind({
    target: r
  }) : ae;
  return {
    entry: c`
      font-family: ${f.mono};
      font-size: ${s.xs};
      line-height: ${a.sm};
      outline: none;
      word-break: break-word;
    `,
    labelButton: c`
      cursor: pointer;
      color: inherit;
      font: inherit;
      outline: inherit;
      background: transparent;
      border: none;
      padding: 0;
    `,
    expander: c`
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: ${t[3]};
      height: ${t[3]};
      padding-left: 3px;
      box-sizing: content-box;
    `,
    expanderIcon: (g) => g ? c`
          transform: rotate(90deg);
          transition: transform 0.1s ease;
        ` : c`
        transform: rotate(0deg);
        transition: transform 0.1s ease;
      `,
    expandButton: c`
      display: flex;
      gap: ${t[1]};
      align-items: center;
      cursor: pointer;
      color: inherit;
      font: inherit;
      outline: inherit;
      background: transparent;
      border: none;
      padding: 0;
    `,
    value: c`
      color: ${e.purple[400]};
    `,
    subEntries: c`
      margin-left: ${t[2]};
      padding-left: ${t[2]};
      border-left: 2px solid ${e.darkGray[400]};
    `,
    info: c`
      color: ${e.gray[500]};
      font-size: ${s["2xs"]};
      padding-left: ${t[1]};
    `,
    refreshValueBtn: c`
      appearance: none;
      border: 0;
      cursor: pointer;
      background: transparent;
      color: inherit;
      padding: 0;
      font-family: ${f.mono};
      font-size: ${s.xs};
    `
  };
};
function ut() {
  const r = at(lt), [e] = K(Jt(r));
  return e;
}
He(["click"]);
var Ut = /* @__PURE__ */ E("<div><div></div><div>/</div><div></div><div>/</div><div>");
function Me(r) {
  const e = ["s", "min", "h", "d"], n = [r / 1e3, r / 6e4, r / 36e5, r / 864e5];
  let t = 0;
  for (let a = 1; a < n.length && !(n[a] < 1); a++)
    t = a;
  return new Intl.NumberFormat(navigator.language, {
    compactDisplay: "short",
    notation: "compact",
    maximumFractionDigits: 0
  }).format(n[t]) + e[t];
}
function _e({
  match: r,
  router: e
}) {
  const n = se();
  if (!r)
    return null;
  const t = e().looseRoutesById[r.routeId];
  if (!t.options.loader)
    return null;
  const f = Date.now() - r.updatedAt, a = t.options.staleTime ?? e().options.defaultStaleTime ?? 0, s = t.options.gcTime ?? e().options.defaultGcTime ?? 30 * 60 * 1e3;
  return (() => {
    var c = Ut(), g = c.firstChild, o = g.nextSibling, i = o.nextSibling, v = i.nextSibling, h = v.nextSibling;
    return u(g, () => Me(f)), u(i, () => Me(a)), u(h, () => Me(s)), y(() => l(c, R(n().ageTicker(f > a)))), c;
  })();
}
var Yt = /* @__PURE__ */ E("<button type=button>➔");
function Se({
  to: r,
  params: e,
  search: n,
  router: t
}) {
  const f = se();
  return (() => {
    var a = Yt();
    return a.$$click = (s) => {
      s.stopPropagation(), t().navigate({
        to: r,
        params: e,
        search: n
      });
    }, ne(a, "title", `Navigate to ${r}`), y(() => l(a, f().navigateButton)), a;
  })();
}
He(["click"]);
var qt = /* @__PURE__ */ E("<button><div>TANSTACK</div><div>TanStack Router v1"), Kt = /* @__PURE__ */ E("<div><div>"), Wt = /* @__PURE__ */ E("<code> "), pe = /* @__PURE__ */ E("<code>"), Zt = /* @__PURE__ */ E("<div><div role=button><div>"), Fe = /* @__PURE__ */ E("<div>"), Xt = /* @__PURE__ */ E("<div><ul>"), Qt = /* @__PURE__ */ E('<div><button><svg xmlns=http://www.w3.org/2000/svg width=10 height=6 fill=none viewBox="0 0 10 6"><path stroke=currentColor stroke-linecap=round stroke-linejoin=round stroke-width=1.667 d="M1 1l4 4 4-4"></path></svg></button><div><div></div><div><div></div></div></div><div><div><div><span>Pathname</span></div><div><code></code></div><div><div><button type=button>Routes</button><button type=button>Matches</button><button type=button>History</button></div><div><div>age / staleTime / gcTime</div></div></div><div>'), er = /* @__PURE__ */ E("<div><span>masked"), it = /* @__PURE__ */ E("<div role=button><div>"), tr = /* @__PURE__ */ E("<li><div>"), rr = /* @__PURE__ */ E("<li>This panel displays the most recent 15 navigations."), nr = /* @__PURE__ */ E("<div><div><div>Cached Matches</div><div>age / staleTime / gcTime</div></div><div>"), ir = /* @__PURE__ */ E("<div><div>Match Details</div><div><div><div><div></div></div><div><div>ID:</div><div><code></code></div></div><div><div>State:</div><div></div></div><div><div>Last Updated:</div><div></div></div></div></div><div>Explorer</div><div>"), or = /* @__PURE__ */ E("<div>Loader Data"), ar = /* @__PURE__ */ E("<div><div><span>Search Params</span></div><div>"), sr = /* @__PURE__ */ E("<span style=margin-left:0.5rem;>"), lr = /* @__PURE__ */ E('<button type=button style=cursor:pointer; aria-label="Copy value to clipboard">');
const ot = 15;
function dr(r) {
  const {
    className: e,
    ...n
  } = r, t = se();
  return (() => {
    var f = qt(), a = f.firstChild, s = a.nextSibling;
    return st(f, je(n, {
      get class() {
        return R(t().logo, e ? e() : "");
      }
    }), !1, !0), y((c) => {
      var g = t().tanstackLogo, o = t().routerLogo;
      return g !== c.e && l(a, c.e = g), o !== c.t && l(s, c.t = o), c;
    }, {
      e: void 0,
      t: void 0
    }), f;
  })();
}
function ze(r) {
  return (() => {
    var e = Kt(), n = e.firstChild;
    return e.style.setProperty("display", "flex"), e.style.setProperty("align-items", "center"), e.style.setProperty("width", "100%"), u(e, () => r.left, n), n.style.setProperty("flex-grow", "1"), n.style.setProperty("min-width", "0"), u(n, () => r.children), u(e, () => r.right, null), y(() => l(e, r.class)), e;
  })();
}
function ft({
  routerState: r,
  router: e,
  route: n,
  isRoot: t,
  activeId: f,
  setActiveId: a
}) {
  const s = se(), c = G(() => r().pendingMatches || r().matches), g = G(() => r().matches.find((v) => v.routeId === n.id)), o = G(() => {
    try {
      if (g()?.params) {
        const v = g()?.params, h = n.path || tt(n.id);
        if (h.startsWith("$")) {
          const _ = h.slice(1);
          if (v[_])
            return `(${v[_]})`;
        }
      }
      return "";
    } catch {
      return "";
    }
  }), i = G(() => {
    if (t || !n.path) return;
    const v = Object.assign({}, ...c().map((_) => _.params)), h = xt({
      path: n.fullPath,
      params: v,
      leaveWildcards: !1,
      leaveParams: !1,
      decodeCharMap: e().pathParamsDecodeCharMap
    });
    return h.isMissingParams ? void 0 : h.interpolatedPath;
  });
  return (() => {
    var v = Zt(), h = v.firstChild, _ = h.firstChild;
    return h.$$click = () => {
      g() && a(f() === n.id ? "" : n.id);
    }, u(h, S(ze, {
      get class() {
        return R(s().routesRow(!!g()));
      },
      get left() {
        return S(wt, {
          get when() {
            return i();
          },
          children: (m) => S(Se, {
            get to() {
              return m();
            },
            router: e
          })
        });
      },
      get right() {
        return S(_e, {
          get match() {
            return g();
          },
          router: e
        });
      },
      get children() {
        return [(() => {
          var m = Wt(), P = m.firstChild;
          return u(m, () => t ? he : n.path || tt(n.id), P), y(() => l(m, s().code)), m;
        })(), (() => {
          var m = pe();
          return u(m, o), y(() => l(m, s().routeParamInfo)), m;
        })()];
      }
    }), null), u(v, (() => {
      var m = L(() => !!n.children?.length);
      return () => m() ? (() => {
        var P = Fe();
        return u(P, () => [...n.children].sort((N, U) => N.rank - U.rank).map((N) => S(ft, {
          routerState: r,
          router: e,
          route: N,
          activeId: f,
          setActiveId: a
        }))), y(() => l(P, s().nestedRouteRow(!!t))), P;
      })() : null;
    })(), null), y((m) => {
      var P = `Open match details for ${n.id}`, N = R(s().routesRowContainer(n.id === f(), !!g())), U = R(s().matchIndicator(It(c(), n)));
      return P !== m.e && ne(h, "aria-label", m.e = P), N !== m.t && l(h, m.t = N), U !== m.a && l(_, m.a = U), m;
    }, {
      e: void 0,
      t: void 0,
      a: void 0
    }), v;
  })();
}
const Le = function({
  ...e
}) {
  const {
    isOpen: n = !0,
    setIsOpen: t,
    handleDragStart: f,
    router: a,
    routerState: s,
    shadowDOMTarget: c,
    ...g
  } = e, {
    onCloseClick: o
  } = ht(), i = se(), {
    className: v,
    style: h,
    ..._
  } = g;
  pt(a, "No router was found for the TanStack Router Devtools. Please place the devtools in the <RouterProvider> component tree or pass the router instance to the devtools manually.");
  const [m, P] = Re("tanstackRouterDevtoolsActiveTab", "routes"), [N, U] = Re("tanstackRouterDevtoolsActiveRouteId", ""), [O, Q] = K([]), [F, x] = K(!1);
  Oe(() => {
    const M = s().matches, D = M[M.length - 1];
    if (!D)
      return;
    const V = $t(() => O()), J = V[0], de = J && J.pathname === D.pathname && JSON.stringify(J.search ?? {}) === JSON.stringify(D.search ?? {});
    (!J || !de) && (V.length >= ot && x(!0), Q((me) => {
      const ce = [D, ...me];
      return ce.splice(ot), ce;
    }));
  });
  const w = G(() => [...s().pendingMatches ?? [], ...s().matches, ...s().cachedMatches].find((D) => D.routeId === N() || D.id === N())), q = G(() => Object.keys(s().location.search).length), W = G(() => ({
    ...a(),
    state: s()
  })), Y = G(() => Object.fromEntries(Pt(Object.keys(W()), ["state", "routesById", "routesByPath", "flatRoutes", "options", "manifest"].map((M) => (D) => D !== M)).map((M) => [M, W()[M]]).filter((M) => typeof M[1] != "function" && !["__store", "basepath", "injectedHtml", "subscribers", "latestLoadPromise", "navigateTimeout", "resetNextScroll", "tempLocationKey", "latestLocation", "routeTree", "history"].includes(M[0])))), le = G(() => w()?.loaderData), $e = G(() => w()), De = G(() => s().location.search);
  return (() => {
    var M = Qt(), D = M.firstChild, V = D.firstChild, J = D.nextSibling, de = J.firstChild, me = de.nextSibling, ce = me.firstChild, Be = J.nextSibling, Ne = Be.firstChild, be = Ne.firstChild;
    be.firstChild;
    var ye = be.nextSibling, gt = ye.firstChild, Ie = ye.nextSibling, Ee = Ie.firstChild, xe = Ee.firstChild, we = xe.nextSibling, Te = we.nextSibling, vt = Ee.nextSibling, Ge = Ie.nextSibling;
    return st(M, je({
      get class() {
        return R(i().devtoolsPanel, "TanStackRouterDevtoolsPanel", v ? v() : "");
      },
      get style() {
        return h ? h() : "";
      }
    }, _), !1, !0), u(M, f ? (() => {
      var d = Fe();
      return mt(d, "mousedown", f, !0), y(() => l(d, i().dragHandle)), d;
    })() : null, D), D.$$click = (d) => {
      t && t(!1), o(d);
    }, u(de, S(dr, {
      "aria-hidden": !0,
      onClick: (d) => {
        t && t(!1), o(d);
      }
    })), u(ce, S(oe, {
      label: "Router",
      value: Y,
      defaultExpanded: {
        state: {},
        context: {},
        options: {}
      },
      filterSubEntries: (d) => d.filter((p) => typeof p.value() != "function")
    })), u(be, (() => {
      var d = L(() => !!s().location.maskedLocation);
      return () => d() ? (() => {
        var p = er(), B = p.firstChild;
        return y((z) => {
          var k = i().maskedBadgeContainer, C = i().maskedBadge;
          return k !== z.e && l(p, z.e = k), C !== z.t && l(B, z.t = C), z;
        }, {
          e: void 0,
          t: void 0
        }), p;
      })() : null;
    })(), null), u(gt, () => s().location.pathname), u(ye, (() => {
      var d = L(() => !!s().location.maskedLocation);
      return () => d() ? (() => {
        var p = pe();
        return u(p, () => s().location.maskedLocation?.pathname), y(() => l(p, i().maskedLocation)), p;
      })() : null;
    })(), null), xe.$$click = () => {
      P("routes");
    }, we.$$click = () => {
      P("matches");
    }, Te.$$click = () => {
      P("history");
    }, u(Ge, S(yt, {
      get children() {
        return [S(Pe, {
          get when() {
            return m() === "routes";
          },
          get children() {
            return S(ft, {
              routerState: s,
              router: a,
              get route() {
                return a().routeTree;
              },
              isRoot: !0,
              activeId: N,
              setActiveId: U
            });
          }
        }), S(Pe, {
          get when() {
            return m() === "matches";
          },
          get children() {
            var d = Fe();
            return u(d, () => (s().pendingMatches?.length ? s().pendingMatches : s().matches)?.map((p, B) => (() => {
              var z = it(), k = z.firstChild;
              return z.$$click = () => U(N() === p.id ? "" : p.id), u(z, S(ze, {
                get left() {
                  return S(Se, {
                    get to() {
                      return p.pathname;
                    },
                    get params() {
                      return p.params;
                    },
                    get search() {
                      return p.search;
                    },
                    router: a
                  });
                },
                get right() {
                  return S(_e, {
                    match: p,
                    router: a
                  });
                },
                get children() {
                  var C = pe();
                  return u(C, () => `${p.routeId === he ? he : p.pathname}`), y(() => l(C, i().matchID)), C;
                }
              }), null), y((C) => {
                var $ = `Open match details for ${p.id}`, T = R(i().matchRow(p === w())), H = R(i().matchIndicator(Ae(p)));
                return $ !== C.e && ne(z, "aria-label", C.e = $), T !== C.t && l(z, C.t = T), H !== C.a && l(k, C.a = H), C;
              }, {
                e: void 0,
                t: void 0,
                a: void 0
              }), z;
            })())), d;
          }
        }), S(Pe, {
          get when() {
            return m() === "history";
          },
          get children() {
            var d = Xt(), p = d.firstChild;
            return u(p, S(bt, {
              get each() {
                return O();
              },
              children: (B, z) => (() => {
                var k = tr(), C = k.firstChild;
                return u(k, S(ze, {
                  get left() {
                    return S(Se, {
                      get to() {
                        return B.pathname;
                      },
                      get params() {
                        return B.params;
                      },
                      get search() {
                        return B.search;
                      },
                      router: a
                    });
                  },
                  get right() {
                    return S(_e, {
                      match: B,
                      router: a
                    });
                  },
                  get children() {
                    var $ = pe();
                    return u($, () => `${B.routeId === he ? he : B.pathname}`), y(() => l($, i().matchID)), $;
                  }
                }), null), y(($) => {
                  var T = R(i().matchRow(B === w())), H = R(i().matchIndicator(z() === 0 ? "green" : "gray"));
                  return T !== $.e && l(k, $.e = T), H !== $.t && l(C, $.t = H), $;
                }, {
                  e: void 0,
                  t: void 0
                }), k;
              })()
            }), null), u(p, (() => {
              var B = L(() => !!F());
              return () => B() ? (() => {
                var z = rr();
                return y(() => l(z, i().historyOverflowContainer)), z;
              })() : null;
            })(), null), d;
          }
        })];
      }
    })), u(Be, (() => {
      var d = L(() => !!s().cachedMatches.length);
      return () => d() ? (() => {
        var p = nr(), B = p.firstChild, z = B.firstChild, k = z.nextSibling, C = B.nextSibling;
        return u(C, () => s().cachedMatches.map(($) => (() => {
          var T = it(), H = T.firstChild;
          return T.$$click = () => U(N() === $.id ? "" : $.id), u(T, S(ze, {
            get left() {
              return S(Se, {
                get to() {
                  return $.pathname;
                },
                get params() {
                  return $.params;
                },
                get search() {
                  return $.search;
                },
                router: a
              });
            },
            get right() {
              return S(_e, {
                match: $,
                router: a
              });
            },
            get children() {
              var A = pe();
              return u(A, () => `${$.id}`), y(() => l(A, i().matchID)), A;
            }
          }), null), y((A) => {
            var ee = `Open match details for ${$.id}`, Z = R(i().matchRow($ === w())), te = R(i().matchIndicator(Ae($)));
            return ee !== A.e && ne(T, "aria-label", A.e = ee), Z !== A.t && l(T, A.t = Z), te !== A.a && l(H, A.a = te), A;
          }, {
            e: void 0,
            t: void 0,
            a: void 0
          }), T;
        })())), y(($) => {
          var T = i().cachedMatchesContainer, H = i().detailsHeader, A = i().detailsHeaderInfo;
          return T !== $.e && l(p, $.e = T), H !== $.t && l(B, $.t = H), A !== $.a && l(k, $.a = A), $;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        }), p;
      })() : null;
    })(), null), u(M, (() => {
      var d = L(() => !!(w() && w()?.status));
      return () => d() ? (() => {
        var p = ir(), B = p.firstChild, z = B.nextSibling, k = z.firstChild, C = k.firstChild, $ = C.firstChild, T = C.nextSibling, H = T.firstChild, A = H.nextSibling, ee = A.firstChild, Z = T.nextSibling, te = Z.firstChild, ue = te.nextSibling, fe = Z.nextSibling, Ce = fe.firstChild, ge = Ce.nextSibling, ie = z.nextSibling, ve = ie.nextSibling;
        return u($, (() => {
          var b = L(() => !!(w()?.status === "success" && w()?.isFetching));
          return () => b() ? "fetching" : w()?.status;
        })()), u(ee, () => w()?.id), u(ue, (() => {
          var b = L(() => !!s().pendingMatches?.find((j) => j.id === w()?.id));
          return () => b() ? "Pending" : s().matches.find((j) => j.id === w()?.id) ? "Active" : "Cached";
        })()), u(ge, (() => {
          var b = L(() => !!w()?.updatedAt);
          return () => b() ? new Date(w()?.updatedAt).toLocaleTimeString() : "N/A";
        })()), u(p, (() => {
          var b = L(() => !!le());
          return () => b() ? [(() => {
            var j = or();
            return y(() => l(j, i().detailsHeader)), j;
          })(), (() => {
            var j = Fe();
            return u(j, S(oe, {
              label: "loaderData",
              value: le,
              defaultExpanded: {}
            })), y(() => l(j, i().detailsContent)), j;
          })()] : null;
        })(), ie), u(ve, S(oe, {
          label: "Match",
          value: $e,
          defaultExpanded: {}
        })), y((b) => {
          var j = i().thirdContainer, Ve = i().detailsHeader, Je = i().matchDetails, Ue = i().matchStatus(w()?.status, w()?.isFetching), Ye = i().matchDetailsInfoLabel, qe = i().matchDetailsInfo, Ke = i().matchDetailsInfoLabel, We = i().matchDetailsInfo, Ze = i().matchDetailsInfoLabel, Xe = i().matchDetailsInfo, Qe = i().detailsHeader, et = i().detailsContent;
          return j !== b.e && l(p, b.e = j), Ve !== b.t && l(B, b.t = Ve), Je !== b.a && l(k, b.a = Je), Ue !== b.o && l(C, b.o = Ue), Ye !== b.i && l(T, b.i = Ye), qe !== b.n && l(A, b.n = qe), Ke !== b.s && l(Z, b.s = Ke), We !== b.h && l(ue, b.h = We), Ze !== b.r && l(fe, b.r = Ze), Xe !== b.d && l(ge, b.d = Xe), Qe !== b.l && l(ie, b.l = Qe), et !== b.u && l(ve, b.u = et), b;
        }, {
          e: void 0,
          t: void 0,
          a: void 0,
          o: void 0,
          i: void 0,
          n: void 0,
          s: void 0,
          h: void 0,
          r: void 0,
          d: void 0,
          l: void 0,
          u: void 0
        }), p;
      })() : null;
    })(), null), u(M, (() => {
      var d = L(() => !!q());
      return () => d() ? (() => {
        var p = ar(), B = p.firstChild;
        B.firstChild;
        var z = B.nextSibling;
        return u(B, typeof navigator < "u" ? (() => {
          var k = sr();
          return u(k, S(cr, {
            getValue: () => {
              const C = s().location.search;
              return JSON.stringify(C);
            }
          })), k;
        })() : null, null), u(z, S(oe, {
          value: De,
          get defaultExpanded() {
            return Object.keys(s().location.search).reduce((k, C) => (k[C] = {}, k), {});
          }
        })), y((k) => {
          var C = i().fourthContainer, $ = i().detailsHeader, T = i().detailsContent;
          return C !== k.e && l(p, k.e = C), $ !== k.t && l(B, k.t = $), T !== k.a && l(z, k.a = T), k;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        }), p;
      })() : null;
    })(), null), y((d) => {
      var p = i().panelCloseBtn, B = i().panelCloseBtnIcon, z = i().firstContainer, k = i().row, C = i().routerExplorerContainer, $ = i().routerExplorer, T = i().secondContainer, H = i().matchesContainer, A = i().detailsHeader, ee = i().detailsContent, Z = i().detailsHeader, te = i().routeMatchesToggle, ue = m() === "routes", fe = R(i().routeMatchesToggleBtn(m() === "routes", !0)), Ce = m() === "matches", ge = R(i().routeMatchesToggleBtn(m() === "matches", !0)), ie = m() === "history", ve = R(i().routeMatchesToggleBtn(m() === "history", !1)), b = i().detailsHeaderInfo, j = R(i().routesContainer);
      return p !== d.e && l(D, d.e = p), B !== d.t && ne(V, "class", d.t = B), z !== d.a && l(J, d.a = z), k !== d.o && l(de, d.o = k), C !== d.i && l(me, d.i = C), $ !== d.n && l(ce, d.n = $), T !== d.s && l(Be, d.s = T), H !== d.h && l(Ne, d.h = H), A !== d.r && l(be, d.r = A), ee !== d.d && l(ye, d.d = ee), Z !== d.l && l(Ie, d.l = Z), te !== d.u && l(Ee, d.u = te), ue !== d.c && (xe.disabled = d.c = ue), fe !== d.w && l(xe, d.w = fe), Ce !== d.m && (we.disabled = d.m = Ce), ge !== d.f && l(we, d.f = ge), ie !== d.y && (Te.disabled = d.y = ie), ve !== d.g && l(Te, d.g = ve), b !== d.p && l(vt, d.p = b), j !== d.b && l(Ge, d.b = j), d;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0,
      i: void 0,
      n: void 0,
      s: void 0,
      h: void 0,
      r: void 0,
      d: void 0,
      l: void 0,
      u: void 0,
      c: void 0,
      w: void 0,
      m: void 0,
      f: void 0,
      y: void 0,
      g: void 0,
      p: void 0,
      b: void 0
    }), M;
  })();
};
function cr({
  getValue: r
}) {
  const [e, n] = K(!1);
  let t = null;
  const f = async () => {
    if (typeof navigator > "u" || !navigator.clipboard?.writeText) {
      console.warn("TanStack Router Devtools: Clipboard API unavailable");
      return;
    }
    try {
      const a = r();
      await navigator.clipboard.writeText(a), n(!0), t && clearTimeout(t), t = setTimeout(() => n(!1), 2500);
    } catch (a) {
      console.error("TanStack Router Devtools: Failed to copy", a);
    }
  };
  return Ct(() => {
    t && clearTimeout(t);
  }), (() => {
    var a = lr();
    return a.$$click = f, u(a, () => e() ? "✅" : "📋"), y(() => ne(a, "title", e() ? "Copied!" : "Copy")), a;
  })();
}
He(["click", "mousedown"]);
const ur = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  BaseTanStackRouterDevtoolsPanel: Le,
  default: Le
}, Symbol.toStringTag, { value: "Module" })), gr = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  B: Le,
  a: Et,
  b: se,
  c: ur,
  u: Re
}, Symbol.toStringTag, { value: "Module" }));
export {
  Le as B,
  Et as a,
  se as b,
  R as c,
  gr as d,
  Re as u
};
