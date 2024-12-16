import * as THREE from 'three'

import { IntegralCurve, EquipotentialCurve } from '@alfredo-taboada/stress'

interface Label {
    position: THREE.Vector3;
    text: string;
}

interface StressCurveConfig {
    theta: number;
    phi: number;
    color?: number;
    lineWidth?: number;
}

interface CurveCollection {
    curve: THREE.Line;
    config: StressCurveConfig;
}

export class StressSphere {
    private sphere: THREE.Mesh;
    private container: THREE.Group;
    private labels: Label[] = [];
    private circles: THREE.Group;
    private integralCurves: THREE.Group;
    private equipotentialCurves: THREE.Group;

    private currentStressState: {
        sigma1: number;
        sigma2: number;
        sigma3: number;
    } | null = null;

    private integralCurveConfigs: StressCurveConfig[] = [];
    private equipotentialCurveConfigs: StressCurveConfig[] = [];
    private integralCurveCollections: CurveCollection[] = [];
    private equipotentialCurveCollections: CurveCollection[] = [];

    constructor(private radius: number = 1) {
        this.container = new THREE.Group();
        this.circles = new THREE.Group();
        this.integralCurves = new THREE.Group();
        this.equipotentialCurves = new THREE.Group();

        this.initializeSphere();
        this.addReferenceCircles();
        this.addDirectionalArrows();
        this.container.add(this.circles);
        this.container.add(this.integralCurves);
        this.container.add(this.equipotentialCurves);
    }

    /**
     * Add a new integral curve with specified parameters
     */
    public addIntegralCurve(config: StressCurveConfig): void {
        this.integralCurveConfigs.push({
            ...config,
            color: config.color ?? 0x0000ff,
            lineWidth: config.lineWidth ?? 2
        });

        if (this.currentStressState) {
            this.updateSingleIntegralCurve(config);
        }
    }

    /**
     * Add a new equipotential curve with specified parameters
     */
    public addEquipotentialCurve(config: StressCurveConfig): void {
        this.equipotentialCurveConfigs.push({
            ...config,
            color: config.color ?? 0x00ff00,
            lineWidth: config.lineWidth ?? 2
        });

        if (this.currentStressState) {
            this.updateSingleEquipotentialCurve(config);
        }
    }

    /**
     * Remove all integral curves
     */
    public clearIntegralCurves(): void {
        this.integralCurveConfigs = [];
        this.integralCurveCollections = [];
        this.integralCurves.clear();
    }

    /**
     * Remove all equipotential curves
     */
    public clearEquipotentialCurves(): void {
        this.equipotentialCurveConfigs = [];
        this.equipotentialCurveCollections = [];
        this.equipotentialCurves.clear();
    }

    /**
     * Update stress state and regenerate all curves
     */
    public updateStressState(sigma1: number, sigma2: number, sigma3: number): void {
        this.currentStressState = { sigma1, sigma2, sigma3 };

        // Clear existing curves but maintain configs
        this.integralCurves.clear();
        this.equipotentialCurves.clear();
        this.integralCurveCollections = [];
        this.equipotentialCurveCollections = [];

        // Regenerate all curves with new stress state
        this.integralCurveConfigs.forEach(config => {
            this.updateSingleIntegralCurve(config);
        });

        this.equipotentialCurveConfigs.forEach(config => {
            this.updateSingleEquipotentialCurve(config);
        });
    }

    public getObject(): THREE.Group {
        return this.container;
    }

    public setVisible(visible: boolean): void {
        this.container.visible = visible;
    }

    public setSphereColor(color: number): void {
        if (this.sphere.material instanceof THREE.MeshPhongMaterial) {
            this.sphere.material.color.setHex(color);
        }
    }

    // ===========================================================================
    //                              P  R  I  V  A  T  E
    // ===========================================================================

    private initializeSphere(): void {
        const geometry = new THREE.SphereGeometry(this.radius, 64, 32);
        const material = new THREE.MeshPhongMaterial({
            color: 0xaaaaaa,
            transparent: false,
            opacity: 0.8
        });

        this.sphere = new THREE.Mesh(geometry, material);
        this.sphere.name = "stress-sphere";
        this.container.add(this.sphere);
    }

    private addReferenceCircles(): void {
        const r = this.radius * 1.001; // Slightly larger to avoid z-fighting
        const segments = 360;

        // Create circles in XY, XZ, and YZ planes
        const circles = [
            this.createCircle(r, 'xy'),
            this.createCircle(r, 'xz'),
            this.createCircle(r, 'yz')
        ];

        circles.forEach(circle => {
            const material = new THREE.LineBasicMaterial({
                color: 0x000000,
                linewidth: 2
            });
            const line = new THREE.LineLoop(circle, material);
            this.circles.add(line);
        });
    }

    private createCircle(radius: number, plane: 'xy' | 'xz' | 'yz'): THREE.BufferGeometry {
        const points: THREE.Vector3[] = [];
        const segments = 360;

        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            let x = 0, y = 0, z = 0;

            switch (plane) {
                case 'xy':
                    x = radius * Math.cos(theta);
                    y = radius * Math.sin(theta);
                    z = 0;
                    break;
                case 'xz':
                    x = radius * Math.cos(theta);
                    y = 0;
                    z = radius * Math.sin(theta);
                    break;
                case 'yz':
                    x = 0;
                    y = radius * Math.cos(theta);
                    z = radius * Math.sin(theta);
                    break;
            }

            points.push(new THREE.Vector3(x, y, z));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return geometry;
    }

    private addDirectionalArrows(): void {
        const arrowLength = this.radius * 0.5;
        const arrowPositions = [
            { dir: [0, 0, 1], pos: [0, 0, this.radius * 1.6], color: 0x0000ff, label: 'Up' },
            { dir: [1, 0, 0], pos: [this.radius * 1.6, 0, 0], color: 0xff0000, label: 'East' },
            { dir: [0, 1, 0], pos: [0, this.radius * 1.6, 0], color: 0x00ff00, label: 'North' },
            { dir: [0, 0, 1], pos: [0, 0, this.radius * 2], color: 0x0000ff, label: 'σ2' },
            { dir: [1, 0, 0], pos: [this.radius * 2, 0, 0], color: 0xff0000, label: 'σ1' },
            { dir: [0, 1, 0], pos: [0, this.radius * 2, 0], color: 0x00ff00, label: 'σ3' }
        ];

        arrowPositions.forEach(({ dir, pos, color, label }) => {
            this.addArrow(
                new THREE.Vector3(...dir),
                new THREE.Vector3(...dir),
                new THREE.Vector3(...pos),
                color,
                label
            );
        });
    }

    private addArrow(direction: THREE.Vector3, origin: THREE.Vector3, position: THREE.Vector3,
        color: number, label: string): void {
        direction.normalize();
        const length = this.radius * 0.5;
        const headLength = length * 0.2;
        const headWidth = length * 0.3;

        const arrowHelper = new THREE.ArrowHelper(
            direction,
            origin,
            length,
            color,
            headLength,
            headWidth
        );

        this.container.add(arrowHelper);
        this.labels.push({ position, text: label });
    }

    private updateSingleIntegralCurve(config: StressCurveConfig): void {
        if (!this.currentStressState) return;

        const { sigma1, sigma2, sigma3 } = this.currentStressState;
        const lambda: [number, number, number] = [-sigma1, -sigma3, -sigma2];

        const integralBuilder = new IntegralCurve(lambda, this.radius * 1.001);
        const curveData = integralBuilder.generate(config.theta, config.phi);
        const curve = this.createCurveFromData(curveData, config.color!, config.lineWidth!);

        if (curve) {
            this.integralCurves.add(curve);
            this.integralCurveCollections.push({ curve, config });
        }
    }

    private updateSingleEquipotentialCurve(config: StressCurveConfig): void {
        if (!this.currentStressState) return;

        const { sigma1, sigma2, sigma3 } = this.currentStressState;
        const lambda: [number, number, number] = [-sigma1, -sigma3, -sigma2];

        const equipotentialBuilder = new EquipotentialCurve(lambda, this.radius * 1.001);
        const curveData = equipotentialBuilder.generate(config.theta, config.phi);
        const curve = this.createCurveFromData(curveData, config.color!, config.lineWidth!);

        if (curve) {
            this.equipotentialCurves.add(curve);
            this.equipotentialCurveCollections.push({ curve, config });
        }
    }

    private createCurveFromData(curveData: string, color: number, lineWidth: number): THREE.Line | null {
        const points: THREE.Vector3[] = [];
        const lines = curveData.split('\n');

        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts[0] === 'VRTX' || parts[0] === 'PVRTX') {
                points.push(new THREE.Vector3(
                    parseFloat(parts[2]),
                    parseFloat(parts[3]),
                    parseFloat(parts[4])
                ));
            }
        });

        if (points.length > 0) {
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: color,
                linewidth: lineWidth
            });
            return new THREE.Line(geometry, material);
        }

        return null;
    }
}
