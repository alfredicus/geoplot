import * as d3 from 'd3';

/**
 * @category Histogram
 */
export interface HistoDataPoint {
    id: number;
    angle: number;
}

/**
 * @category Histogram
 */
export interface HistogramOptions {
    container: string;
    width: number;
    height: number;
    margin: { top: number; right: number; bottom: number; left: number };
    binSize: number;
    showLabels?: boolean
}

/**
 * @example
 * import { Histogram } from './histogram'
 * 
 * const data = Array.from({length: 500}, (_, i) => ({
        id: i + 1,
        angle: Math.random() * 360 - 180
    }))

    const options = {
        container: "#histogram",
        width: 800,
        height: 400,
        margin: {top: 40, right: 30, bottom: 50, left: 60},
        binSize: 30
    }

    const histogram = new Histogram(data, options)
    histogram.render()

    @category Histogram
 */
export class Histogram {
    private svg: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
    private width: number;
    private height: number;
    private data: HistoDataPoint[];
    private options: HistogramOptions;

    constructor(data: HistoDataPoint[], options: HistogramOptions) {
        this.data = data;
        this.options = options;
        this.options.showLabels = options.showLabels ?? true

        this.width = options.width - options.margin.left - options.margin.right;
        this.height = options.height - options.margin.top - options.margin.bottom;

        this.svg = d3.select(options.container)
            .append("svg")
            .attr("width", this.width + options.margin.left + options.margin.right)
            .attr("height", this.height + options.margin.top + options.margin.bottom)
            .append("g")
            .attr("transform", `translate(${options.margin.left},${options.margin.top})`);
    }

    public updateData(data: HistoDataPoint[]) {
        this.data = data
        this.render()
    }

    public render(): void {
        this.svg.selectAll('rect').remove()
        this.svg.selectAll("g").remove()
        this.svg.selectAll("text").remove()
        this.svg.selectAll(".bar-label").remove()

        const histogram = d3.histogram<HistoDataPoint, number>()
            .value(d => d.angle)
            .domain(d3.extent(this.data, d => d.angle) as [number, number])
            .thresholds(d3.range(-180, 181, this.options.binSize));

        const bins = histogram(this.data);

        const x = d3.scaleLinear()
            .domain([bins[0].x0 as number, bins[bins.length - 1].x1 as number])
            .range([0, this.width]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.length) as number])
            .range([this.height, 0]);

        this.drawBars(bins, x, y);
        this.drawAxes(x, y);
        this.drawLabels();
    }

    private drawBars(bins: d3.Bin<HistoDataPoint, number>[], x: d3.ScaleLinear<number, number, never>, y: d3.ScaleLinear<number, number, never>): void {
        this.svg.selectAll("rect")
            .data(bins)
            .enter()
            .append("rect")
            .attr("x", d => x(d.x0 as number))
            .attr("y", d => y(d.length))
            .attr("width", d => x(d.x1 as number) - x(d.x0 as number) - 1)
            .attr("height", d => this.height - y(d.length))
            .attr("class", "bar");

        if (this.options.showLabels) {
            this.svg.selectAll(".bar-label")
                .data(bins)
                .enter()
                .append("text")
                .attr("class", "bar-label")
                .attr("x", d => x(d.x0 as number) + (x(d.x1 as number) - x(d.x0 as number)) / 2)
                .attr("y", d => y(d.length) + 15)
                .text(d => d.map(item => item.id).join(', '))
                .call(this.wrap, this.options.binSize)
        }
    }

    private drawAxes(x: d3.ScaleLinear<number, number, never>, y: d3.ScaleLinear<number, number, never>): void {
        this.svg.append("g")
            .attr("transform", `translate(0,${this.height})`)
            .call(d3.axisBottom(x));

        this.svg.append("g")
            .call(d3.axisLeft(y));
    }

    private drawLabels(): void {
        this.svg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("x", this.width / 2)
            .attr("y", this.height + this.options.margin.bottom - 10)
            .text("Angular Difference");

        this.svg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -this.height / 2)
            .attr("y", -this.options.margin.left + 20)
            .text("Number of Data Points");
    }

    private wrap(text: d3.Selection<SVGTextElement, d3.Bin<HistoDataPoint, number>, SVGGElement, unknown>, width: number): void {
        text.each(function () {
            let text = d3.select(this),
                words = text.text().split(/,\s*/).reverse(),
                word,
                line: string[] = [],
                lineNumber = 0,
                lineHeight = 1.1,
                y = text.attr("y"),
                dy = parseFloat(text.attr("dy") || "0"),
                tspan = text.text(null).append("tspan").attr("x", text.attr("x")).attr("y", y).attr("dy", dy + "em");
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(", "));
                if ((tspan.node() as SVGTSpanElement).getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(", "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", text.attr("x")).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                }
            }
        });
    }
}