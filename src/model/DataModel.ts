import { DataPoint } from "./DataPoint";

export interface DataState {
    dataPoints: DataPoint[];
    selectedCategory: string | null;
}

// Model
export class DataModel {
    private data: DataState;
    private listeners: ((state: DataState) => void)[] = [];

    constructor() {
        this.data = {
            dataPoints: [],
            selectedCategory: null,
        }
    }

    subscribe(listener: (state: DataState) => void) {
        this.listeners.push(listener);
        listener(this.data);
    }

    private notify() {
        this.listeners.forEach(listener => listener(this.data));
    }

    updateData(newData: DataPoint[]) {
        this.data.dataPoints = newData;
        this.notify();
    }

    setSelectedCategory(category: string | null) {
        this.data.selectedCategory = category;
        this.notify();
    }

    getFilteredData(): DataPoint[] {
        return this.data.dataPoints.filter(point => {
            return !this.data.selectedCategory || point.category === this.data.selectedCategory
        });
    }
}
