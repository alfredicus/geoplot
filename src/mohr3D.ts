import * as d3 from 'd3';

export type Normal = [number, number, number]

// TODO using an interface instead of a type
export type MohrCircleOptions = {
    width: 500,
    height: 500,

    // TODO: rewrite using margin: { top: number; right: number; bottom: number; left: number }
    top: 140,
    right: 40,
    bottom: 40,
    left: 40,

    div: string,
    sigma1: number,
    sigma2: number,
    sigma3: number
}

interface Margin {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

interface StressPoint {
    sigma_n: number;
    tau: number;
}

/**
 * @example
 * ```
 * const m = new MohrCircle({
 *      div: "mohr",
 *      sigma1: 1,
 *      sigma2: 0.5,
 *      sigma3: 0
 * })
 * // ...
 * m.setSigmas(3, 2, 1)
 * m.addNormals([[1,0,0], [0,1,0], [0,0,1], [1,0,1]])
 * ```
 */
export class MohrCircle {
    private svg_: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>
    private xScale: d3.ScaleLinear<number, number>
    private yScale: d3.ScaleLinear<number, number>
    private xAxis: d3.Axis<number | { valueOf(): number }>
    private yAxis: d3.Axis<number | { valueOf(): number }>
    private margin: Margin
    private circleGroup: d3.Selection<SVGGElement, unknown, HTMLElement, any>

    constructor(private params: MohrCircleOptions) {
        const svg = d3.select(`#${params.div}`)
            .append("svg")
            .attr("width", params.width)
            .attr("height", params.height)

        this.margin = { top: params.top, right: params.right, bottom: params.bottom, left: params.left }

        // Initial axes creation
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${params.height / 2})`)
            .call(d3.axisBottom(d3.scaleLinear()))

        svg.append("g")
            .attr("class", "y-axis")
            .attr("transform", `translate(${this.margin.left},0)`)
            .call(d3.axisLeft(d3.scaleLinear()))

        // Group for Mohr circles
        this.circleGroup = svg.append("g")

        // Default values before initialization...
        this.xScale = d3.scaleLinear()
        this.yScale = d3.scaleLinear()
        this.xAxis = d3.axisBottom(this.xScale)
        this.yAxis = d3.axisBottom(this.yScale)

        // Initialization
        this.setSigmas(params.sigma1, params.sigma2, params.sigma3)

        this.svg_ = svg
    }

    public setSigmas(sigma1: number, sigma2: number, sigma3: number): void {
        // Ensure sigma3 <= sigma2 <= sigma1
        this.params.sigma1 = sigma1
        this.params.sigma3 = sigma2
        this.params.sigma2 = sigma3

        this.updateMohrCircles()
    }

    public addNormals(ns: Normal[]) {
        ns.forEach( n => this.addNormal(n))
    }

    public addNormal(n: Normal) {
        // throw "Todo..."

        // Calculate and plot the point (σn, τ)
        const [n1, n2, n3] = normalizeVector(n[0], n[1], n[2])

        const { sigma_n, tau } = this.calculateStressPoint(n1, n2, n3);

        this.circleGroup.append("circle")
            .attr("cx", this.xScale(sigma_n))
            .attr("cy", this.yScale(tau))
            .attr("r", 5)
            .attr("fill", "purple");

        this.circleGroup.append("text")
            .attr("x", this.xScale(sigma_n) + 10)
            .attr("y", this.yScale(tau) - 10)
            .text(`(σn, τ)`)
            .attr("fill", "purple");
    }
    // -----------------------------------------------

    private updateScales(): void {
        const maxStress = Math.max(this.params.sigma1, this.params.sigma2, this.params.sigma3);
        const maxTau = maxStress / 2; // Maximum possible shear stress

        // Calculate the range to maintain aspect ratio
        const xRange = this.params.width - this.margin.left - this.margin.right;
        const yRange = this.params.height - this.margin.top - this.margin.bottom;
        const scale = Math.min(xRange / maxStress, yRange / (2 * maxTau));

        this.xScale = d3.scaleLinear()
            .domain([0, maxStress])
            .range([this.margin.left, this.margin.left + maxStress * scale]);

        this.yScale = d3.scaleLinear()
            .domain([-maxTau, maxTau])
            .range([this.margin.top + maxTau * scale, this.margin.top - maxTau * scale]);

        // Update axes
        this.xAxis = d3.axisBottom(this.xScale);
        this.yAxis = d3.axisLeft(this.yScale);

        // Redraw axes
        this.svg_.select<SVGGElement>(".x-axis")
            .attr("transform", `translate(0,${this.yScale(0)})`)
            .call(this.xAxis);

        this.svg_.select<SVGGElement>(".y-axis")
            .attr("transform", `translate(${this.xScale(0)},0)`)
            .call(this.yAxis);
    }

    // Function to update Mohr circles
    private updateMohrCircles() {
        this.updateScales()

        this.circleGroup.selectAll("*").remove();

        const sigma1 = this.params.sigma1
        const sigma2 = this.params.sigma2
        const sigma3 = this.params.sigma3

        this.drawColoredArea(sigma1, sigma2, sigma3);

        this.drawHalfCircle(sigma3, sigma1, "blue");
        this.drawHalfCircle(sigma3, sigma2, "green");
        this.drawHalfCircle(sigma2, sigma1, "red");

        [sigma1, sigma2, sigma3].forEach((sigma, i) => {
            this.circleGroup.append("circle")
                .attr("cx", this.xScale(sigma))
                .attr("cy", this.yScale(0))
                .attr("r", 4)
                .attr("fill", ["red", "green", "blue"][i]);
        });

        this.circleGroup.append("text")
            .attr("x", this.xScale(sigma1 * 1.1))
            .attr("y", this.yScale(0) + 20)
            .text("σ");

        this.circleGroup.append("text")
            .attr("x", this.xScale(0) - 30)
            .attr("y", this.yScale(100) - 10)
            .text("τ");

        ["σ1", "σ2", "σ3"].forEach((label, i) => {
            this.circleGroup.append("text")
                .attr("x", this.xScale([sigma1, sigma2, sigma3][i]))
                .attr("y", this.yScale(0) + 20)
                .text(label);
        });
    }

    // Modify the drawHalfCircle function
    private drawHalfCircle(x1: number, x2: number, color: string): void {
        const centerX = (x1 + x2) / 2;
        const radius = Math.abs(x2 - x1) / 2;

        const arc = d3.arc<any>()
            .innerRadius(0)
            .outerRadius(this.xScale(radius) - this.xScale(0))
            .startAngle(-Math.PI / 2)
            .endAngle(Math.PI / 2);

        this.circleGroup.append("path")
            .attr("d", arc)
            .attr("transform", `translate(${this.xScale(centerX)},${this.yScale(0)})`)
            .attr("fill", "none")
            .attr("stroke", color);
    }

    // Function to draw the colored area between circles
    private drawColoredArea(x1: number, x2: number, x3: number): void {
        const bigRadius = Math.abs(x3 - x1) / 2;
        const smallRadius1 = Math.abs(x2 - x1) / 2;
        const smallRadius2 = Math.abs(x3 - x2) / 2;
        const bigCenter = (x1 + x3) / 2;
        const smallCenter1 = (x1 + x2) / 2;
        const smallCenter2 = (x2 + x3) / 2;

        const path = d3.path();

        const xScale = this.xScale
        const yScale = this.yScale

        // Start with the big half-circle
        path.moveTo(xScale(x3), yScale(0));
        path.arc(xScale(bigCenter), yScale(0), xScale(bigRadius) - xScale(0), 0, Math.PI, true);

        // Cut out the right small half-circle
        path.arc(xScale(smallCenter1), yScale(0), xScale(smallRadius1) - xScale(0), Math.PI, 0, false);

        // Cut out the left small half-circle
        path.arc(xScale(smallCenter2), yScale(0), xScale(smallRadius2) - xScale(0), Math.PI, 0, false);

        path.closePath();

        this.circleGroup.append("path")
            .attr("d", path.toString())
            .attr("fill", "rgba(200, 200, 200, 0.5)")
            .attr("stroke", "none");
    }

    private calculateStressPoint(n1: number, n2: number, n3: number): StressPoint {
        const sigma_n = this.params.sigma1 * n1 * n1 + this.params.sigma2 * n2 * n2 + this.params.sigma3 * n3 * n3
        const sigma_squared = (this.params.sigma1 * n1) ** 2 + (this.params.sigma2 * n2) ** 2 + (this.params.sigma3 * n3) ** 2
        const tau = Math.sqrt(sigma_squared - sigma_n ** 2)
        return { sigma_n, tau }
    }
}

function normalizeVector(n1: number, n2: number, n3: number): [number, number, number] {
    const magnitude = Math.sqrt(n1 * n1 + n2 * n2 + n3 * n3)
    return [n1 / magnitude, n2 / magnitude, n3 / magnitude]
}















/*
// Create sliders
const sliderContainer = d3.select("#sliders");

const sigmaSliders: Slider[] = ["σ1", "σ2", "σ3"].map((label, i) => {
    const container = sliderContainer.append("div").attr("class", "slider-container");
    container.append("span").text(`${label}: `);
    const input = container.append("input")
        .attr("type", "range")
        .attr("min", 0)
        .attr("max", 200)
        .attr("step", 1)
        .attr("value", [sigma1, sigma2, sigma3][i]);
    const valueSpan = container.append("span").text(String([sigma1, sigma2, sigma3][i]));
    return { input, valueSpan, label };
});

const nSliders: Slider[] = ['n1', 'n2', 'n3'].map(label => {
    const container = sliderContainer.append("div").attr("class", "slider-container");
    container.append("span").text(`${label}: `);
    const input = container.append("input")
        .attr("type", "range")
        .attr("min", -1)
        .attr("max", 1)
        .attr("step", 0.01)
        .attr("value", String(1 / Math.sqrt(3)));
    const valueSpan = container.append("span").text((1 / Math.sqrt(3)).toFixed(2));
    return { input, valueSpan };
});


// Handle sigma slider events
sigmaSliders.forEach((slider, i) => {
    slider.input.on("input", function (this: HTMLInputElement) {
        const newValue = +this.value;
        console.log(`Slider ${slider.label} changed to ${newValue}`);

        if (i === 0) { // sigma1
            sigma1 = newValue;
            sigma2 = Math.min(sigma2, sigma1);
            sigma3 = Math.min(sigma3, sigma2);
        } else if (i === 1) { // sigma2
            sigma2 = newValue;
            sigma1 = Math.max(sigma1, sigma2);
            sigma3 = Math.min(sigma3, sigma2);
        } else if (i === 2) { // sigma3
            sigma3 = newValue;
            if (sigma3 > sigma2) {
                // If sigma3 exceeds sigma2, increase sigma2 to match sigma3
                sigma2 = sigma3;
            }
            // Ensure sigma1 is still the largest
            sigma1 = Math.max(sigma1, sigma2);
        }

        updateSigmaValues();
    });
});

// Handle n slider events
nSliders.forEach((slider) => {
    slider.input.on("input", function (this: HTMLInputElement) {
        const value = +this.value;
        slider.valueSpan.text(value.toFixed(2));
        updateMohrCircles();
    });
});

// Add a manual update button for testing
sliderContainer.append("button")
    .text("Manual Update")
    .on("click", updateSigmaValues);
*/
