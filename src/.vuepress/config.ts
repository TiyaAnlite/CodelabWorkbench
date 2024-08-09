import { defineUserConfig } from "vuepress";

import theme from "./theme.js";

export default defineUserConfig({
  base: "/",

  lang: "zh-CN",
  title: "Codelab Workbench",
  description: "CodelabWorkbench - 野生技术研究台",

  theme,

  // 和 PWA 一起启用
  // shouldPrefetch: false,
});
