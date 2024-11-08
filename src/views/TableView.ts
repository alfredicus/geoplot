export interface TableViewConfig {
    width?: string;
    height?: string;
    columnWidths?: { [key: string]: string };
    minColumnWidth?: string;
}

export class TableView {
    private container: HTMLElement;
    private table: HTMLElement;
    private data: any[];
    private sortColumn: string | null = null;
    private sortDirection: 'asc' | 'desc' = 'asc';
    private columns: string[] = [];
    private filters: Map<string, string> = new Map();
    private config: TableViewConfig;
    private onDataChange?: (data: any[]) => void;

    constructor(containerId: string, data: any[], config: TableViewConfig = {}, onChange?: (data: any[]) => void) {
        const container = document.getElementById(containerId);
        if (!container) throw new Error('Container not found');

        this.container = container;
        this.data = data;
        this.onDataChange = onChange;
        this.columns = Object.keys(data[0] || {});
        this.config = {
            width: '800px',
            height: '600px',
            minColumnWidth: '150px',
            ...config
        };

        this.table = document.createElement('div');
        this.table.className = 'excel-table';
        this.init();
    }

    private init(): void {
        this.createStyles();
        this.renderTable();
        this.attachEventListeners();
    }

    private createStyles(): void {
        const style = document.createElement('style');
        style.textContent = `
            .excel-table {
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
                width: ${this.config.width};
                height: ${this.config.height};
                display: flex;
                flex-direction: column;
            }

            .excel-toolbar {
                padding: 8px 16px;
                background: #f8fafc;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                gap: 8px;
                flex-shrink: 0;
            }

            .excel-content-wrapper {
                flex: 1;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .excel-header {
                display: grid;
                background: #f8fafc;
                border-bottom: 2px solid #e2e8f0;
                position: sticky;
                top: 0;
                z-index: 2;
                flex-shrink: 0;
            }

            .excel-body-wrapper {
                overflow: auto;
                flex: 1;
            }

            .excel-body {
                display: grid;
                min-width: 100%;
            }

            .excel-header,
            .excel-body {
                ${this.createGridTemplateColumns()}
            }

            .excel-header-cell {
                padding: 12px 16px;
                font-weight: 600;
                color: #1e293b;
                user-select: none;
                display: flex;
                align-items: center;
                gap: 8px;
                position: relative;
                min-width: ${this.config.minColumnWidth};
                box-sizing: border-box;
            }

            .excel-cell {
                padding: 8px 16px;
                border-bottom: 1px solid #e2e8f0;
                border-right: 1px solid #e2e8f0;
                min-height: 40px;
                display: flex;
                align-items: center;
                min-width: ${this.config.minColumnWidth};
                box-sizing: border-box;
                background: white;
            }

            /* ... rest of the styles remain the same ... */
        `;
        document.head.appendChild(style);
    }

    private createGridTemplateColumns(): string {
        if (this.config.columnWidths) {
            const templateColumns = this.columns
                .map(col => this.config.columnWidths?.[col] || this.config.minColumnWidth)
                .join(' ');
            return `grid-template-columns: ${templateColumns};`;
        }
        return `grid-template-columns: repeat(${this.columns.length}, minmax(${this.config.minColumnWidth}, 1fr));`;
    }

    private renderTable(): void {
        this.table.innerHTML = '';

        // Toolbar
        const toolbar = this.createToolbar();
        this.table.appendChild(toolbar);

        // Content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'excel-content-wrapper';

        // Header
        const header = this.createHeader();
        contentWrapper.appendChild(header);

        // Body wrapper for scrolling
        const bodyWrapper = document.createElement('div');
        bodyWrapper.className = 'excel-body-wrapper';

        // Body
        const body = this.createBody();
        bodyWrapper.appendChild(body);
        contentWrapper.appendChild(bodyWrapper);

        this.table.appendChild(contentWrapper);
        this.container.appendChild(this.table);
    }

    private createToolbar(): HTMLElement {
        const toolbar = document.createElement('div');
        toolbar.className = 'excel-toolbar';

        const exportBtn = document.createElement('button');
        exportBtn.className = 'excel-button';
        exportBtn.textContent = 'Export CSV';
        exportBtn.onclick = () => this.exportToCsv();

        toolbar.appendChild(exportBtn);
        return toolbar;
    }

    private createHeader(): HTMLElement {
        const header = document.createElement('div');
        header.className = 'excel-header';

        this.columns.forEach(column => {
            const headerCell = document.createElement('div');
            headerCell.className = 'excel-header-cell sortable';

            const titleSpan = document.createElement('span');
            titleSpan.textContent = this.formatColumnName(column);
            headerCell.appendChild(titleSpan);

            const sortIndicator = document.createElement('span');
            sortIndicator.className = 'sort-indicator';
            headerCell.appendChild(sortIndicator);

            const filter = document.createElement('input');
            filter.className = 'excel-filter';
            filter.placeholder = 'Filter...';
            filter.value = this.filters.get(column) || '';
            headerCell.appendChild(filter);

            if (this.sortColumn === column) {
                headerCell.classList.add(`sort-${this.sortDirection}`);
            }

            header.appendChild(headerCell);
        });

        return header;
    }

    private createBody(): HTMLElement {
        const body = document.createElement('div');
        body.className = 'excel-body';

        const filteredData = this.getFilteredData();
        const sortedData = this.getSortedData(filteredData);

        sortedData.forEach((row, rowIndex) => {
            this.columns.forEach(column => {
                const cell = document.createElement('div');
                cell.className = 'excel-cell editable';
                cell.textContent = this.formatCellValue(row[column]);
                cell.dataset.row = rowIndex.toString();
                cell.dataset.column = column;
                body.appendChild(cell);
            });
        });

        return body;
    }

    private formatColumnName(column: string): string {
        return column
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
    }

    private formatCellValue(value: any): string {
        if (value instanceof Date) {
            return value.toLocaleDateString();
        }
        if (typeof value === 'number') {
            return value.toLocaleString();
        }
        return value?.toString() || '';
    }

    private attachEventListeners(): void {
        // Sort handling
        this.table.querySelectorAll('.excel-header-cell').forEach(headerCell => {
            headerCell.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                if (!target.classList.contains('excel-filter')) {
                    const columnIndex = Array.from(headerCell.parentNode!.children).indexOf(headerCell);
                    const column = this.columns[columnIndex];
                    this.handleSort(column);
                }
            });
        });

        // Filter handling
        this.table.querySelectorAll('.excel-filter').forEach((filter, index) => {
            const column = this.columns[index];
            filter.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                this.handleFilter(column, target.value);
            });
        });

        // Cell editing
        this.table.addEventListener('dblclick', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('excel-cell')) {
                this.startEditing(target);
            }
        });
    }

    private startEditing(cell: HTMLElement): void {
        const value = cell.textContent || '';
        cell.classList.add('editing');

        const input = document.createElement('input');
        input.value = value;
        input.addEventListener('blur', () => this.finishEditing(cell, input));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') {
                input.value = value;
                input.blur();
            }
        });

        cell.textContent = '';
        cell.appendChild(input);
        input.focus();
    }

    private finishEditing(cell: HTMLElement, input: HTMLInputElement): void {
        const newValue = input.value;
        const rowIndex = parseInt(cell.dataset.row || '0');
        const column = cell.dataset.column || '';

        cell.classList.remove('editing');
        cell.textContent = newValue;

        this.data[rowIndex][column] = this.parseValue(newValue);
        this.onDataChange?.(this.data);
    }

    private parseValue(value: string): any {
        if (!isNaN(Number(value))) return Number(value);
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value);
        return value;
    }

    private handleSort(column: string): void {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        this.renderTable();
    }

    private handleFilter(column: string, value: string): void {
        if (value) {
            this.filters.set(column, value);
        } else {
            this.filters.delete(column);
        }
        this.renderTable();
    }

    private getFilteredData(): any[] {
        return this.data.filter(row => {
            return Array.from(this.filters.entries()).every(([column, filterValue]) => {
                const cellValue = this.formatCellValue(row[column]).toLowerCase();
                return cellValue.includes(filterValue.toLowerCase());
            });
        });
    }

    private getSortedData(data: any[]): any[] {
        if (!this.sortColumn) return data;

        return [...data].sort((a, b) => {
            const aVal = a[this.sortColumn!];
            const bVal = b[this.sortColumn!];

            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return this.sortDirection === 'asc' ? comparison : -comparison;
        });
    }

    private exportToCsv(): void {
        const headers = this.columns.join(',');
        const rows = this.getFilteredData().map(row =>
            this.columns.map(col => `"${row[col]}"`).join(',')
        );

        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'export.csv';
        a.click();

        URL.revokeObjectURL(url);
    }
}

// class TableViewController {
//     private model: DataModel;
//     private view: TableView;

//     constructor(model: DataModel, containerId: string) {
//         this.model = model;
//         this.view = new TableView(containerId, model.getData(), this.handleDataChange);
//     }

//     private handleDataChange = (newData: any[]) => {
//         this.model.updateData(newData);
//     }
// }