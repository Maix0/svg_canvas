import * as Renderer from "./renderer";

let renderer = new Renderer.SvgRenderer();
const pts = [{
        x: 10 + 0,
        y: 10 + 0
    },
    {
        x: 10 + 15,
        y: 10 + 0
    },
    {
        x: 10 + 15,
        y: 10 + 15
    },
    {
        x: 10 + 0,
        y: 10 + 15
    },
];
renderer.circle(pts.map(v => ({
    radius: 0.25,
    ...v
})), "#00f");

renderer.rectangle([{
    x: 30,
    y: 30,
    width: 10,
    height: 30
}], 4, {
    border: "#e0e",
    fill: "#5ff",
})

renderer.line(pts, "#000000")