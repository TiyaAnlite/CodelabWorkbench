import { navbar } from "vuepress-theme-hope";

export default navbar([
    "/",
    {
        text: "博客",
        icon: "pen-to-square",
        prefix: "/",
        children: ["tech/", "comprehensive-talk/", "appreciation/"]
    },
    {
        text: "随想录",
        icon: "book",
        link: "/thoughts/",
        activeMatch: "^/thoughts",
    },
]);
