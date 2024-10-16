export type Data = {
    R: number,
    theta: number,
    value: number
}

type Point = {
    R: number,
    theta: number
}

/**
 * @example
 * ```
 * const d = new StressDomain('visualization', 500, 500)
 * d.addPoint(0.5, 60)  // Normal fault regime
 * d.addPoint(1.5, 120) // Strike-slip fault regime
 * d.addPoint(2.5, 30)  // Reverse fault regime
 * ```
 */
export class StressDomain {
    private width = 200
    private height = 200
    private margin = { top: 20, right: 20, bottom: 50, left: 40 }
    private graphWidth = 0
    private graphHeight = 0
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private scheme = 'viridis'
    private rDivisions = 50
    private thetaDivisions = 50
    private data: Data[] = []
    private points: Point[] = []

    constructor(div: string, width: number, height: number) {
        this.canvas = document.getElementById(div) as HTMLCanvasElement

        this.canvas.width = width
        this.canvas.height = height
        const ctx = this.canvas.getContext('2d')

        // Set up canvas for high-resolution displays
        const dpr = window.devicePixelRatio || 1
        const rect = this.canvas.getBoundingClientRect()
        this.canvas.width = rect.width * dpr
        this.canvas.height = rect.height * dpr
        this.canvas.style.width = `${rect.width}px`
        this.canvas.style.height = `${rect.height}px`
        ctx.scale(dpr, dpr)

        const w = rect.width
        const h = rect.height

        this.width = w
        this.height = h
        this.margin = { top: 20, right: 20, bottom: 50, left: 40 }
        this.graphWidth = w - this.margin.left - this.margin.right
        this.graphHeight = h - this.margin.top - this.margin.bottom

        this.ctx = ctx

        this.scheme = 'viridis'

        this.rDivisions = 50
        this.thetaDivisions = 50
        this.data = []
        for (let i = 0; i <= this.rDivisions; i++) {
            for (let j = 0; j <= this.thetaDivisions; j++) {
                const R = (i / this.rDivisions) * 3
                const theta = (j / this.thetaDivisions) * 180
                this.data.push({ R, theta, value: Math.random() })
            }
        }


        this.points = []

        // Initial draw
        this.drawVisualization()
    }

    /**
     * 
     * @param name The name if the color table (`viridis`, `plasma`, `inferno` or `bw`)
     */
    public setColorTable(name: string) {
        this.scheme = name
        this.drawVisualization()
    }

    /**
     * 
     * @param R The stress ratio in [0,3] (accounting for the stress regime as well as ratio)
     * @param theta The orientation of the maximum principal horizontal stress according the North and clockwise
     */
    public addPoint(R: number, theta: number) {
        this.points.push({ R, theta })
        this.drawVisualization()
    }

    /**
     * 
     * @param data 
     * @param nR Number of subdivision along R
     * @param nTheta Number of subdivision along Theta
     */
    public setData(data: Data[], nR: number, nTheta: number) {
        this.data = [...data]
        this.rDivisions = nR
        this.thetaDivisions = nTheta
        this.drawVisualization()
    }

    // -------------------

    private drawPoint(R: number, theta: number) {
        const ctx = this.ctx

        // Convert R to Φ' based on the regime
        let phiPrime: number
        if (R >= 0 && R < 1) {
            phiPrime = R // Normal fault regime
        } else if (R >= 1 && R < 2) {
            phiPrime = 2 - R // Strike-slip fault regime
        } else if (R >= 2 && R <= 3) {
            phiPrime = R - 2 // Reverse fault regime
        } else {
            console.error("R value out of range (0-3)")
            return
        }

        // Calculate the position on the canvas
        const x = this.scaleX(R)
        const y = this.scaleY(theta)

        // Draw the point
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, 2 * Math.PI)
        ctx.fillStyle = 'red'
        ctx.fill()
        ctx.strokeStyle = 'black'
        ctx.stroke()
        ctx.fillStyle = 'rgba(255, 127, 0, 0)'
        ctx.fillRect(this.scaleX(0), this.margin.top, this.graphWidth / 3, this.graphHeight)

        // Add a label
        ctx.fillStyle = 'black'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'bottom'
        ctx.font = '12px Arial'
        ctx.fillText(`(R=${R.toFixed(1)}, θ=${theta.toFixed(0)}°)`, x - 30, y - 10)
    }

    private hexToRgb(hex) {
        let bigint = parseInt(hex.slice(1), 16)
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255
        };
    }

    private rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
    }

    private interpolate(start, end, factor) {
        return start + (end - start) * factor
    }

    private interpolateColor(color1, color2, factor) {
        let rgb1 = this.hexToRgb(color1)
        let rgb2 = this.hexToRgb(color2)
        let r = Math.round(this.interpolate(rgb1.r, rgb2.r, factor))
        let g = Math.round(this.interpolate(rgb1.g, rgb2.g, factor))
        let b = Math.round(this.interpolate(rgb1.b, rgb2.b, factor))
        return this.rgbToHex(r, g, b)
    }

    private getColor(value) {
        const colorTable = colorSchemes[this.scheme]
        let scaledValue = value * (colorTable.length - 1);
        let index = Math.floor(scaledValue);  // Index de la couleur inférieure
        let factor = scaledValue - index;     // Facteur d'interpolation

        if (index >= colorTable.length - 1) {
            return colorTable[colorTable.length - 1];  // Si la valeur est maximale, on retourne la dernière couleur
        }

        return this.interpolateColor(colorTable[index], colorTable[index + 1], factor);
    }

    // Helper functions
    private scaleX(value) {
        return (value / 3) * this.graphWidth + this.margin.left
    }

    private scaleY(value) {
        return this.graphHeight - (value / 180) * this.graphHeight + this.margin.top
    }

    private drawVisualization() {
        const ctx = this.ctx
        const dpr = window.devicePixelRatio || 1

        // Clear canvas
        ctx.clearRect(0, 0, this.width * dpr, this.height * dpr)

        const rectWidth = this.graphWidth / this.rDivisions
        const rectHeight = this.graphHeight / this.thetaDivisions

        this.data.forEach(point => {
            const x = this.scaleX(point.R) - rectWidth / 2
            const y = this.scaleY(point.theta) - rectHeight / 2
            ctx.fillStyle = this.getColor(point.value)
            ctx.fillRect(x, y, rectWidth + 1, rectHeight + 1)
        });

        // Draw specific points (circles)
        this.points.forEach(p => this.drawPoint(p.R, p.theta))

        // // Draw background rectangles
        // ctx.fillStyle = 'rgba(255, 0, 0, 1)'
        // ctx.fillRect(this.scaleX(0), this.margin.top, this.graphWidth / 3, this.graphHeight)
        // ctx.fillStyle = 'rgba(0, 255, 0, 1)'
        // ctx.fillRect(this.scaleX(1), this.margin.top, this.graphWidth / 3, this.graphHeight)
        // ctx.fillStyle = 'rgba(0, 0, 255, 1)'
        // ctx.fillRect(this.scaleX(2), this.margin.top, this.graphWidth / 3, this.graphHeight)

        ctx.fillStyle = '#000000'

        // Draw axes
        ctx.beginPath()
        ctx.moveTo(this.margin.left, this.height - this.margin.bottom)
        ctx.lineTo(this.width - this.margin.right, this.height - this.margin.bottom)
        ctx.moveTo(this.margin.left, this.margin.top)
        ctx.lineTo(this.margin.left, this.height - this.margin.bottom)

        ctx.moveTo(this.scaleX(1), this.margin.top)
        ctx.lineTo(this.scaleX(1), this.height - this.margin.bottom)
        ctx.moveTo(this.scaleX(2), this.margin.top)
        ctx.lineTo(this.scaleX(2), this.height - this.margin.bottom)

        ctx.stroke()

        // Draw ticks and labels
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.font = '12px Arial'
        for (let i = 0; i <= 3; i++) {
            const x = this.scaleX(i)
            ctx.moveTo(x, this.height - this.margin.bottom)
            ctx.lineTo(x, this.height - this.margin.bottom + 5)
            ctx.fillText(i.toString(), x, this.height - this.margin.bottom + 10)
        }

        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        for (let i = 0; i <= 180; i += 45) {
            const y = this.scaleY(i)
            ctx.moveTo(this.margin.left - 5, y)
            ctx.lineTo(this.margin.left, y)
            ctx.fillText(i.toString(), this.margin.left - 10, y)
        }
        ctx.stroke()

        // Draw labels
        ctx.textAlign = 'center'
        ctx.font = '14px Arial'
        ctx.fillText("R", this.width / 2, this.height - 10)

        ctx.save()
        ctx.translate(this.margin.left - 30, this.height / 2)
        ctx.rotate(-Math.PI / 2)
        ctx.fillText("θ°", 0, 0)
        ctx.restore()

        // Draw regime labels
        ctx.textBaseline = 'bottom'
        ctx.fillText("Normal", this.scaleX(0.5), this.height - 25)
        ctx.fillText("Strike slip", this.scaleX(1.5), this.height - 25)
        ctx.fillText("Reverse", this.scaleX(2.5), this.height - 25)
    }
}

const colorSchemes = {
    viridis: ['#440154', '#482878', '#3e4989', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725'],
    plasma: ['#0d0887', '#46039f', '#7201a8', '#9c179e', '#bd3786', '#d8576b', '#ed7953', '#fb9f3a', '#fdca26', '#f0f921'],
    inferno: ['#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#f7d13d', '#fcffa4'],
    bw: ['#000000', '#ffffff']
}
