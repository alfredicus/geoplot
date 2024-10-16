
import * as d3 from 'd3'

export interface WulffOptions {
    width?: number
    height?: number
    drawAxes?: boolean
    drawLabels?: boolean
    interactivity?: boolean
    margin?: {
        top?: number
        right?: number
        bottom?: number
        left?: number
    }
}

export class Wulff {
    // public API
    
    constructor(private container: string, private options: WulffOptions = {}) {
        this.width = options.width ?? 600;
        this.height = options.height ?? 600;
        this.margin = {
            top: options.margin?.top ?? 20,
            right: options.margin?.right ?? 20,
            bottom: options.margin?.bottom ?? 20,
            left: options.margin?.left ?? 20
        }
        this.radius = Math.min(this.width, this.height) / 2

        this.svgContainer = d3.select(container)
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);

        this.svg = this.svgContainer
            .append('g')
            .attr('transform', `translate(${this.width / 2 + this.margin.left},${this.height / 2 + this.margin.top})`);

        this.tooltip = d3.select(container)
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background-color", "white")
            .style("border", "solid")
            .style("border-width", "1px")
            .style("border-radius", "5px")
            .style("padding", "10px");

        this.drawCircle()

        const da = options.drawAxes ?? true
        if (da) {
            this.drawAxes()
        }

        const dl = options.drawLabels ?? true
        if (dl) {
            this.drawLabels()
        }

        this.interact_ = options.interactivity ?? true
        if (this.interact_) {
            this.setupInteractivity()
        }
    }

    public addGreatCircle(strike: number, dip: number, color: string = 'black'): void {
        const id = `gc-${this.greatCircles.length}`
        this.greatCircles.push({ id, strike, dip, color })
        this.draw()
    }

    public deleteGreatCircle(id: string): void {
        this.greatCircles = this.greatCircles.filter(gc => gc.id !== id)
        this.svg.select(`#hit-area-${id}`).remove()
        this.svg.select(`#visible-${id}`).remove()
    }

    // -----------------------------------------------------

    private setupInteractivity(): void {
        d3.select('body').on('keydown', (event) => {
            if (event.key === 'Shift') {
                this.multiSelection = true;
            }
        });

        d3.select('body').on('keyup', (event) => {
            if (event.key === 'Shift') {
                this.multiSelection = false;
            }
        });

        d3.select("body")
            .on("keydown", (event) => {
                if (event.key === 'Escape') {
                    this.svg.selectAll(".great-circle").attr("stroke-width", 1.5);
                    this.draw();
                    this.selectedGreatCircles = [];
                }
                else if (event.key === 'Backspace') {
                    const isSelected = circle => !this.selectedGreatCircles.includes(circle)

                    this.greatCircles = this.greatCircles.filter(isSelected)
                    this.selectedGreatCircles = [];
                    this.tooltip.transition().duration(500).style("opacity", 0);

                    this.draw();
                }
            })
    }

    private drawAxes(): void {
        const axes: Point[] = [
            { x: -this.radius, y: 0 },
            { x: this.radius, y: 0 },
            { x: 0, y: -this.radius },
            { x: 0, y: this.radius }
        ];

        this.svg.selectAll('.axis')
            .data(axes)
            .enter()
            .append('line')
            .attr('class', 'axis')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', d => d.x)
            .attr('y2', d => d.y)
            .attr('stroke', 'black')
            .attr('stroke-width', 1);
    }

    private drawLabels(): void {
        const labels = ['W', 'E', 'N', 'S'];
        const positions: Point[] = [
            { x: -this.radius - 20, y: 0 },
            { x: this.radius + 20, y: 0 },
            { x: 0, y: -this.radius - 20 },
            { x: 0, y: this.radius + 20 }
        ];

        this.svg.selectAll('.label')
            .data(labels)
            .enter()
            .append('text')
            .attr('class', 'label')
            .attr('x', (d, i) => positions[i].x)
            .attr('y', (d, i) => positions[i].y)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .text(d => d);
    }

    private drawCircle(): void {
        this.svg.append('circle')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', this.radius)
            .attr('fill', 'none')
            .attr('stroke', 'black');
    }

    private draw(): void {
        this.svg.selectAll('.great-circle-hit-area').remove();
        this.svg.selectAll('.great-circle-visible').remove();

        const lineGenerator = d3.line<Point>()
            .x(d => d.x)
            .y(d => d.y)
            .curve(d3.curveBasis);

        // Créer les zones de détection invisibles
        if (this.interact_) {
            this.svg.selectAll('.great-circle-hit-area')
                .data(this.greatCircles)
                .enter()
                .append('path')
                .attr('class', 'great-circle-hit-area')
                .attr('id', gc => `hit-area-${gc.id}`)
                .attr('d', gc => lineGenerator(this.calculateGreatCirclePoints(gc.strike, gc.dip)))
                .attr('fill', 'none')
                .attr('stroke', 'transparent')
                .attr('stroke-width', 10) // Ajustez cette valeur pour la sensibilité
                .style('cursor', 'pointer')
                .on('mouseover', (event, gc) => {
                    this.showTooltip(event, gc)
                })
                .on('mouseout', () => {
                    this.hideTooltip()
                })
                .on('click', (event, gc) => {
                    this.handleCircleClick(event, gc)
                })
        }

        // Créer les lignes visibles
        this.svg.selectAll('.great-circle-visible')
            .data(this.greatCircles)
            .enter()
            .append('path')
            .attr('class', 'great-circle-visible')
            .attr('id', gc => `visible-${gc.id}`)
            .attr('d', gc => lineGenerator(this.calculateGreatCirclePoints(gc.strike, gc.dip)))
            .attr('fill', 'none')
            .attr('stroke', gc => gc.color)
            .attr('stroke-width', 2);
    }

    private calculateGreatCirclePoints(strike: number, dip: number): Point[] {
        const points: Point[] = [];
        const strikeRad = (strike * Math.PI) / 180;
        const dipRad = (dip * Math.PI) / 180;

        // Calculate the pole of the plane
        const px = Math.cos(strikeRad) * Math.sin(dipRad);
        const py = Math.sin(strikeRad) * Math.sin(dipRad);
        const pz = Math.cos(dipRad);

        for (let t = -Math.PI / 2; t <= Math.PI / 2; t += 0.01) {

            // Calculate a point on the plane perpendicular to the pole
            let x1 = Math.cos(t);
            let y1 = Math.sin(t);
            let z = 0;
            let x2 = 0;
            let y2 = 0;

            // Rotation to align the plane with the pole
            const temp_x = x1
            const temp_y = y1
            x1 = temp_x * Math.cos(dipRad) + z * Math.sin(dipRad)
            z = - temp_x * Math.sin(dipRad) + z * Math.cos(dipRad)

            const temp_x2 = x1
            x1 = temp_x2 * Math.cos(strikeRad) + y1 * Math.sin(strikeRad)
            y1 = - temp_x2 * Math.sin(strikeRad) + y1 * Math.cos(strikeRad)

            const xy_mag = Math.sqrt(x1 ** 2 + y1 ** 2)

            // Check if the point is in the lower hemisphere
            if (z <= 0) {
                // Project the point onto the stereographic plane passing through the origin
                // z is negative in the lower hemisphere 
                const z_abs = Math.abs(z);
                const r = this.radius * Math.sqrt((1 - z_abs) / (1 + z_abs))
                const x = r * x1 / xy_mag
                const y = - r * y1 / xy_mag
                points.push({ x, y });

                // points.push( { r * x / Math.sqrt(x * x + y * y), -r * y / Math.sqrt(x * x + y * y) } )

                // const x = this.radius * Math.sin(t) * Math.cos(strikeRad) + this.radius * Math.cos(t) * Math.sin(strikeRad) * Math.sin(dipRad);
                // const y = -this.radius * Math.sin(t) * Math.sin(strikeRad) + this.radius * Math.cos(t) * Math.cos(strikeRad) * Math.sin(dipRad);
                // points.push({ x, y });
            }
        }

        return points;
    }

    private handleCircleClick(event: MouseEvent, gc: GreatCircle): void {
        if (!this.multiSelection) {
            this.svg.selectAll('.great-circle-visible').attr('stroke-width', 2);
        }
        const visibleCircle = this.svg.select(`#visible-${gc.id}`);
        const currentWidth = parseFloat(visibleCircle.attr('stroke-width'));
        visibleCircle.attr('stroke-width', currentWidth === 2 ? 4 : 2);

        if (event.altKey) {
            this.deleteGreatCircle(gc.id);
        }
    }

    private showTooltip(event: MouseEvent, gc: GreatCircle): void {
        this.tooltip.transition()
            .duration(200)
            .style("opacity", .9);
        this.tooltip.html(`Strike: ${gc.strike}°<br>Dip: ${gc.dip}°`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
    }

    private hideTooltip(): void {
        this.tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    }

    private svg: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
    private svgContainer: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private width: number;
    private height: number;
    private radius: number;
    private interact_ = true
    private margin: { top: number; right: number; bottom: number; left: number };
    private greatCircles: GreatCircle[] = [];
    private selectedGreatCircles: GreatCircle[] = [];
    private multiSelection: boolean = false;
    private tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
}

// -------------------------------

interface Point {
    x: number
    y: number
}

interface GreatCircle {
    id: string;
    strike: number;
    dip: number;
    color: string;
}