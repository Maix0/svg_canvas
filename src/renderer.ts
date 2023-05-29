type RGB = `rgb(${number}, ${number}, ${number})`;
type RGBA = `rgba(${number}, ${number}, ${number}, ${number})`;
type HEX = `#${string}`;

export type Color = RGB | RGBA | HEX;

export interface SvgRendererConfig {
    smoothness: number,
    vbWidth: number,
    vbHeight: number,
    width: number,
    height: number,
    id: string,
    strokeColor: Color,
    backgroundColor: Color,
}

interface Rectangle extends Point {
    width: number,
    height: number,
}

export interface Point {
    x: number,
    y: number,
}


export interface Circle extends Point {
    radius: number,
}


export class SvgRenderer {
    private svgNode: SVGSVGElement;
    public readonly config: SvgRendererConfig;

    public static readonly defaultConfig: SvgRendererConfig = {
        smoothness: 7,
        vbWidth: 100,
        vbHeight: 100,
        width: 1000,
        height: 1000,
        id: "svgRendererOutput",
        strokeColor: "#ff0000",
        backgroundColor: "#ffffff"
    };

    constructor(selector: string);
    constructor(selector: string, config: Partial < SvgRendererConfig > );
    constructor(parent: HTMLElement);
    constructor(parent: HTMLElement, config: Partial < SvgRendererConfig > );
    constructor();

    constructor() {
        let config = SvgRenderer.defaultConfig;
        let elem: (SVGSVGElement) | null = null;

        switch (arguments.length) {
            case 0:
                const out = new SvgRenderer(document.body);
                this.config = out.config;
                this.svgNode = out.svgNode;
                return;
            case 2:
                config = Object.assign(config, arguments[1])
            case 1:
                if (arguments[0] instanceof String) {
                    const tmp = document.querySelector( < string > arguments[0]);
                    if (tmp?.nodeName !== "svg") {
                        throw new TypeError("Element pointed by selector isn't an <svg> element");
                    }
                    elem = < SVGSVGElement > tmp;

                } else if (arguments[0] instanceof HTMLElement) {
                    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    svg.outerHTML = "<svg></svg>";
                    svg.setAttributeNS(null, "viewBox", `0 0 ${config.vbWidth} ${config.vbHeight}`)
                    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg")
                    svg.setAttributeNS(null, "stroke", config.strokeColor);
                    svg.setAttributeNS(null, "width", `${config.width}px`)
                    svg.setAttributeNS(null, "height", `${config.height}px`)
                    svg.style.backgroundColor = config.backgroundColor;
                    svg.id = config.id;
                    arguments[0].appendChild(svg)
                    elem = < SVGSVGElement > svg;
                }
                break;

            default:
                throw new TypeError("You need to provide arguments to the constructor");
        }

        this.svgNode = elem!;
        this.config = config;


        this.config.smoothness = Math.abs(this.config.smoothness);
    }

    public line(points: Point[], strokeColor: Color): void;
    public line(points: Point[]): void;


    public line(): void {
        let points = < Point[] > arguments[0];
        let strokeColor = < Color > (arguments.length == 2 ? arguments[1] : this.config.strokeColor);

        enum Axis {
            Horizontal = "H",
                Vertical = "V",
        }
        let debug: {
            curr: string, //[Axis, number, number, number],
            next: string //[Axis, number, number, number],
        } [] = [];

        const WINDOW_SIZE: number = 3;
        if (points.length < 2) {
            throw new RangeError("Not enought points");
        } {
            let [s, e] = points.slice(0, 2);
            if (s.x == e.x) {
                if (s.y > e.y) {
                    s.y += -this.config.smoothness;
                } else {
                    s.y += +this.config.smoothness;
                }
            } else if (s.y === e.y) {
                if (s.x > e.x) {
                    s.x += +this.config.smoothness;
                } else {
                    s.x += -this.config.smoothness;
                }
            }

        } {
            let [s, e] = points.slice(-2);
            let new_end = Object.assign({}, e);
            if (s.x == e.x) {
                if (s.y > e.y) {
                    new_end.y += 2 * -this.config.smoothness;
                    e.y += -this.config.smoothness;
                } else {
                    new_end.y += 2 * +this.config.smoothness;
                    e.y += +this.config.smoothness;
                }
            } else if (new_end.y === e.y) {

                if (new_end.x > e.x) {
                    new_end.x += 2 * +this.config.smoothness;
                    e.x += +this.config.smoothness;
                } else {
                    new_end.x += 2 * -this.config.smoothness;
                    e.x += -this.config.smoothness;
                }
            }
            points.push(new_end);
        }

        this.svgNode.append(...points.reduce((acc, _, index, arr) => {
            if (index + WINDOW_SIZE > arr.length) {
                //we've reached the maximum number of windows, so don't add any more
                return acc;
            }
            //add a new window of [currentItem, maxWindowSizeItem)
            //wrap in extra array, otherwise .concat flattens it
            acc.push( < [Point, Point, Point] > arr.slice(index, index + WINDOW_SIZE))
            return acc;

        }, < [Point, Point, Point][] > []).map(pts => {
            let axis: [Axis, Axis] = [Axis.Horizontal, Axis.Vertical];

            let diff: [number, number] = [this.config.smoothness, this.config.smoothness];
            for (let i = 1; i >= 0; i--) {
                const [s, e] = [pts[i], pts[i + 1]];

                if (s.x === e.x) {
                    axis[i] = Axis.Vertical;
                    if (s.y > e.y) {
                        diff[i] = +diff[i];
                    } else {
                        diff[i] = -diff[i];
                    }
                } else if (s.y === e.y) {
                    axis[i] = Axis.Horizontal;
                    if (s.x > e.x) {
                        diff[i] = +diff[i]
                    } else {
                        diff[i] = -diff[i]
                    }
                } else {
                    console.debug({
                        s,
                        e
                    })
                    throw new Error("Points are not orthogonal");
                }
            }


            return {
                pts: {
                    start: pts[0],
                    end: pts[1]
                },
                axis: {
                    curr: axis[0],
                    next: axis[1]
                },
                diff: {
                    curr: diff[0],
                    next: diff[1],
                }
            };
        }).map(
            ({
                pts,
                axis,
                diff
            }) => {
                debug.push({
                    curr: `${axis.curr}, ${diff.curr}, ${pts.start.x}, ${pts.start.y}`,
                    next: `${axis.next}, ${diff.next}, ${pts.end.x}, ${pts.end.y}`
                });
                let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                if (axis.curr === axis.next) {
                    console.warn(pts)
                    if (axis.curr === Axis.Horizontal) {
                        path.setAttributeNS(null, "d",
                            // Move to the start of the line
                            // Line to the end
                            `
                            M ${pts.start.x - diff.curr},${pts.start.y}
                            L ${pts.end.x + diff.curr},${pts.end.y}
                            `
                        )
                    } else {
                        path.setAttributeNS(null, "d",
                            // Move to the start of the line
                            // Line to the end
                            `
                            M ${pts.start.x},${pts.start.y - diff.curr}
                            L ${pts.end.x},${pts.end.y + diff.curr}
                            `
                        )
                    }

                } else if (axis.curr === Axis.Horizontal) {
                    path.setAttributeNS(null, "d",
                        // Move to the start of the line
                        // horizontal line to the point
                        // quadratic bezier first point is the end point. second point is the control point
                        // the control point
                        `
                    M ${pts.start.x - diff.curr},${pts.start.y}
                    L ${pts.end.x + diff.curr},${pts.end.y}
                    Q ${pts.end.x},${pts.end.y} ${pts.end.x},${pts.end.y - diff.next}
                    `
                    )
                } else { // Axis.Vertical
                    path.setAttributeNS(null, "d",
                        `
                    M ${pts.start.x},${pts.start.y - diff.curr}
                    L ${pts.end.x},${pts.end.y + diff.curr}
                    Q ${pts.end.x},${pts.end.y} ${pts.end.x - diff.next},${pts.end.y}
                    `
                    )
                }
                path.setAttributeNS(null, "fill", "none");
                path.setAttributeNS(null, "stroke", strokeColor);
                return path;
            }
        ));

        console.table(debug);
    }

    public circle(circles: Circle[]): void;
    public circle(circles: Circle[], color: Color): void;

    public circle() {
        let circles = < Circle[] > arguments[0];
        let color = < Color > (arguments.length == 2 ? arguments[1] : this.config.strokeColor);


        let num = 0;
        this.svgNode.append(...circles.map(c => {
            let elem = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            elem.dataset.num = `${num}`;
            num += 1;
            elem.setAttributeNS(null, "cx", c.x.toString())
            elem.setAttributeNS(null, "cy", c.y.toString())
            elem.setAttributeNS(null, "r", c.radius.toString())
            elem.setAttributeNS(null, "stroke", color)
            elem.setAttributeNS(null, "fill", color)
            return elem;
        }))

    }
    public rectangle(rectangles: Rectangle[]): void;
    public rectangle(rectangles: Rectangle[], rounded: number): void;
    public rectangle(rectangles: Rectangle[], colors: {
        border ? : Color,
        fill ? : Color
    }): void;
    public rectangle(rectangles: Rectangle[], rounded: number, colors: {
        border ? : Color,
        fill ? : Color
    }): void;

    public rectangle() {
        let rectangles = < Rectangle[] > arguments[0];
        let color: {
            border: Color,
            fill: Color
        } = {
            border: this.config.strokeColor,
            fill: this.config.strokeColor
        };
        let rounded = 0;
        switch (arguments.length) {
            case 2:
                if (arguments[1] instanceof Number) {
                    rounded = < number > arguments[1];
                } else {
                    if (arguments[1].border) {
                        color.border = arguments[1].border;
                    }
                    if (arguments[1].fill) {
                        color.fill = arguments[1].fill;
                    }
                }
                break;
            case 3:
                rounded = < number > arguments[1];
                if (arguments[2].border) {
                    color.border = arguments[1].border;
                }
                if (arguments[2].fill) {
                    color.fill = arguments[1].fill;
                }
                break;
        }


        let num = 0;
        this.svgNode.append(...rectangles.map(r => {
            let elem = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            elem.dataset.num = `${num}`;
            num += 1;
            elem.setAttributeNS(null, "x", r.x.toString())
            elem.setAttributeNS(null, "y", r.y.toString())
            elem.setAttributeNS(null, "width", r.width.toString())
            elem.setAttributeNS(null, "height", r.height.toString())
            elem.setAttributeNS(null, "stroke", color.border)
            elem.setAttributeNS(null, "fill", color.fill)
            elem.setAttributeNS(null, "rx", rounded.toString())
            elem.setAttributeNS(null, "ry", rounded.toString())
            return elem;
        }))

    }


    public clear() {
        this.svgNode.replaceChildren()
    }
}