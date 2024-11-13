import { DataModel } from "../model";
import { DataPoint } from "../model/DataPoint";
import { View } from "../views/View";

// Controller
/**
 * @category MVC
 */
export class DataController {
    private model: DataModel;
    private views: View[];

    constructor(model: DataModel) {
        this.model = model;
        this.views = [];

        // Subscribe to model changes
        this.model.subscribe((state) => {
            const filteredData = this.model.getFilteredData();
            this.views.forEach(view => view.update(filteredData));
        });
    }

    addView(view: View) {
        this.views.push(view);
    }

    // Controller actions
    // async fetchData() {
    //     try {
    //         const response = await fetch('api/data');
    //         const newData: DataPoint[] = await response.json();
    //         this.model.updateData(newData);
    //     } catch (error) {
    //         console.error('Error fetching data:', error);
    //     }
    // }

    handleCategorySelect(category: string | null) {
        this.model.setSelectedCategory(category);
    }

    // Additional controller methods for handling user interactions
    handleDataPoint(point: DataPoint) {
        // Handle click or hover on data point
        console.log('Data point selected:', point);
    }

    handleExport() {
        const data = this.model.getFilteredData();
        // Export logic
    }
}