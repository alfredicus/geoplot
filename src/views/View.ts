import { DataPoint } from "../model/DataPoint"

export interface View {
    update(data: DataPoint[]): void
}





// class TableView implements View {
//     private container: HTMLElement;
//     constructor(containerId: string) {
//         this.container = document.getElementById(containerId) as HTMLElement;
//     }
//     update(data: DataPoint[]) {
//         // Implementation for updating table view
//         const table = document.createElement('table');
//         // ... table creation logic
//         this.container.innerHTML = '';
//         this.container.appendChild(table);
//     }
// }

// class PlotView implements View {
//     private container: HTMLElement;
//     constructor(containerId: string) {
//         this.container = document.getElementById(containerId) as HTMLElement;
//     }
//     update(data: DataPoint[]) {
//         // Implementation for updating plot
//         // You could use a charting library like Chart.js or D3.js here
//     }
// }
