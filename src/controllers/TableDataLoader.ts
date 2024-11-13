// First, install required dependency:
// npm install xlsx

import * as XLSX from 'xlsx'
import { TableController } from './TableSelectionController';
import { TableView } from '../views';

/**
 * @category Table
 */
export interface DataLoaderOptions {
    onProgress?: (progress: number) => void;
    onError?: (error: Error) => void;
    dateColumns?: string[];
    numberColumns?: string[];
    encoding?: string;
}

interface ParsedData {
    headers: string[];
    rows: any[];
}

/**
 * @category Table
 */
export class TableDataLoader implements TableController {
    private view: TableView;
    private options: DataLoaderOptions;
    private fileInput: HTMLInputElement;
    private dropZone: HTMLElement;

    constructor(view: TableView, options: DataLoaderOptions = {}) {
        this.view = view;
        this.options = {
            encoding: 'utf-8',
            ...options
        };
        
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = '.csv,.xlsx,.xls';
        this.fileInput.style.display = 'none';
        
        this.dropZone = document.createElement('div');
        this.setupDropZone();
    }

    initialize(): void {
        document.body.appendChild(this.fileInput);
        this.view.getContainer().appendChild(this.dropZone);
        
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        this.setupDragAndDrop();
    }

    destroy(): void {
        this.fileInput.remove();
        this.dropZone.remove();
    }

    private setupDropZone(): void {
        this.dropZone.className = 'table-drop-zone';
        this.dropZone.innerHTML = `
            <div class="drop-zone-content">
                <div class="drop-zone-icon">📄</div>
                <div class="drop-zone-text">
                    Drag & drop your CSV or Excel file here<br>
                    or <span class="drop-zone-button">click to browse</span>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            .table-drop-zone {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.9);
                border: 3px dashed #ccc;
                border-radius: 8px;
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            
            .table-drop-zone.active {
                display: flex;
                background: rgba(235, 245, 255, 0.95);
                border-color: #2196F3;
            }
            
            .drop-zone-content {
                text-align: center;
                color: #666;
            }
            
            .drop-zone-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }
            
            .drop-zone-text {
                font-size: 16px;
                line-height: 1.5;
            }
            
            .drop-zone-button {
                color: #2196F3;
                cursor: pointer;
                text-decoration: underline;
            }
            
            .table-loader {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1001;
            }
            
            .loader-progress {
                width: 200px;
                height: 4px;
                background: #eee;
                border-radius: 2px;
                overflow: hidden;
            }
            
            .loader-progress-bar {
                height: 100%;
                background: #2196F3;
                transition: width 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }

    private setupDragAndDrop(): void {
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        
        const handleDrag = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.add('active');
        };
        
        const handleDragLeave = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.remove('active');
        };
        
        const handleDrop = async (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.remove('active');
            
            const files = e.dataTransfer?.files;
            if (files?.length) {
                await this.processFile(files[0]);
            }
        };
        
        this.view.getContainer().addEventListener('dragenter', handleDrag);
        this.view.getContainer().addEventListener('dragover', handleDrag);
        this.view.getContainer().addEventListener('dragleave', handleDragLeave);
        this.view.getContainer().addEventListener('drop', handleDrop);
    }

    private async handleFileSelect(e: Event): Promise<void> {
        const files = (e.target as HTMLInputElement).files;
        if (files?.length) {
            await this.processFile(files[0]);
        }
    }

    private showLoader(): HTMLElement {
        const loader = document.createElement('div');
        loader.className = 'table-loader';
        loader.innerHTML = `
            <div class="loader-progress">
                <div class="loader-progress-bar" style="width: 0%"></div>
            </div>
        `;
        this.view.getContainer().appendChild(loader);
        return loader;
    }

    private updateLoaderProgress(loader: HTMLElement, progress: number): void {
        const progressBar = loader.querySelector('.loader-progress-bar') as HTMLElement;
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        this.options.onProgress?.(progress);
    }

    private async processFile(file: File): Promise<void> {
        const loader = this.showLoader();
        try {
            this.updateLoaderProgress(loader, 10);

            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            let parsedData: ParsedData;

            if (fileExtension === 'csv') {
                parsedData = await this.parseCSV(file);
            } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
                parsedData = await this.parseExcel(file);
            } else {
                throw new Error('Unsupported file format');
            }

            this.updateLoaderProgress(loader, 70);
            await this.processData(parsedData);
            this.updateLoaderProgress(loader, 100);

        } catch (error) {
            this.options.onError?.(error as Error);
        } finally {
            setTimeout(() => loader.remove(), 500);
        }
    }

    private async parseCSV(file: File): Promise<ParsedData> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const csv = e.target?.result as string;
                    const lines = csv.split('\n');
                    const headers = lines[0].split(',').map(header => 
                        header.trim().replace(/["']/g, '')
                    );
                    
                    const rows = lines.slice(1)
                        .filter(line => line.trim())
                        .map(line => {
                            const values = line.split(',');
                            return headers.reduce((obj, header, index) => {
                                obj[header] = this.parseValue(
                                    values[index]?.trim().replace(/["']/g, '') || '',
                                    header
                                );
                                return obj;
                            }, {} as any);
                        });
                    
                    resolve({ headers, rows });
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file, this.options.encoding);
        });
    }

    private async parseExcel(file: File): Promise<ParsedData> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
                        header: 1,
                        raw: false
                    });
                    
                    const headers = jsonData[0] as string[];
                    const rows = jsonData.slice(1).map(row => {
                        return headers.reduce((obj, header, index) => {
                            obj[header] = this.parseValue(
                                (row as any[])[index]?.toString() || '',
                                header
                            );
                            return obj;
                        }, {} as any);
                    });
                    
                    resolve({ headers, rows });
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    }

    private parseValue(value: string, column: string): any {
        if (!value) return null;
        
        // Check if column is configured as date
        if (this.options.dateColumns?.includes(column)) {
            const date = new Date(value);
            return isNaN(date.getTime()) ? value : date;
        }
        
        // Check if column is configured as number
        if (this.options.numberColumns?.includes(column)) {
            const num = parseFloat(value.replace(/[^\d.-]/g, ''));
            return isNaN(num) ? value : num;
        }
        
        // Auto-detect numbers
        if (/^-?\d*\.?\d+$/.test(value)) {
            return parseFloat(value);
        }
        
        // Auto-detect dates
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            return value;
        }
        
        return date;
    }

    private async processData(parsedData: ParsedData): Promise<void> {
        return new Promise(resolve => {
            // Update table with new data
            // Add slight delay to allow UI to update
            setTimeout(() => {
                this.view.setData(parsedData.rows);
                resolve();
            }, 100);
        });
    }

    // Public API
    showFileDialog(): void {
        this.fileInput.click();
    }

    showDropZone(): void {
        this.dropZone.classList.add('active');
    }

    hideDropZone(): void {
        this.dropZone.classList.remove('active');
    }
}