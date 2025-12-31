/**
 * Data Connectors - Live Data Source Integration
 * 
 * Connects to external data sources:
 * - Google Sheets (public or authenticated)
 * - REST APIs (generic JSON endpoints)
 * - SQL Databases (via backend proxy)
 */

export interface ConnectorConfig {
    type: 'google-sheets' | 'rest-api' | 'sql';
    name: string;
    url?: string;
    apiKey?: string;
    refreshInterval?: number; // minutes
}

export interface ConnectorResult {
    success: boolean;
    data: Record<string, unknown>[];
    columns: string[];
    rowCount: number;
    source: string;
    fetchedAt: Date;
    error?: string;
}

/**
 * Google Sheets Connector
 * 
 * Supports:
 * - Public sheets (no auth required)
 * - Private sheets (requires API key)
 */
export class GoogleSheetsConnector {
    private apiKey?: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || import.meta.env.VITE_GOOGLE_API_KEY;
    }

    /**
     * Extract sheet ID from URL
     */
    private extractSheetId(url: string): string | null {
        // Handle various Google Sheets URL formats
        const patterns = [
            /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
            /^([a-zA-Z0-9-_]+)$/ // Direct ID
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    /**
     * Fetch data from a Google Sheet
     */
    async fetch(urlOrId: string, sheetName: string = 'Sheet1'): Promise<ConnectorResult> {
        const sheetId = this.extractSheetId(urlOrId);

        if (!sheetId) {
            return {
                success: false,
                data: [],
                columns: [],
                rowCount: 0,
                source: 'Google Sheets',
                fetchedAt: new Date(),
                error: 'Invalid Google Sheets URL or ID'
            };
        }

        try {
            // Use Google Sheets API v4 or CSV export
            let url: string;

            if (this.apiKey) {
                // Use API with key
                url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}?key=${this.apiKey}`;
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }

                const json = await response.json();
                return this.parseApiResponse(json, sheetId);
            } else {
                // Use public CSV export (for published sheets)
                url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error('Sheet not public or invalid');
                }

                const csv = await response.text();
                return this.parseCsvResponse(csv, sheetId);
            }
        } catch (error) {
            return {
                success: false,
                data: [],
                columns: [],
                rowCount: 0,
                source: `Google Sheets: ${sheetId}`,
                fetchedAt: new Date(),
                error: error instanceof Error ? error.message : 'Failed to fetch sheet'
            };
        }
    }

    private parseApiResponse(json: { values?: string[][] }, sheetId: string): ConnectorResult {
        const values = json.values || [];
        if (values.length === 0) {
            return {
                success: true,
                data: [],
                columns: [],
                rowCount: 0,
                source: `Google Sheets: ${sheetId}`,
                fetchedAt: new Date()
            };
        }

        const columns = values[0];
        const data = values.slice(1).map(row => {
            const obj: Record<string, unknown> = {};
            columns.forEach((col, i) => {
                obj[col] = row[i] || '';
            });
            return obj;
        });

        return {
            success: true,
            data,
            columns,
            rowCount: data.length,
            source: `Google Sheets: ${sheetId}`,
            fetchedAt: new Date()
        };
    }

    private parseCsvResponse(csv: string, sheetId: string): ConnectorResult {
        const lines = csv.split('\n').filter(l => l.trim());
        if (lines.length === 0) {
            return {
                success: true,
                data: [],
                columns: [],
                rowCount: 0,
                source: `Google Sheets: ${sheetId}`,
                fetchedAt: new Date()
            };
        }

        // Simple CSV parsing (handles quoted strings)
        const parseRow = (line: string): string[] => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;

            for (const char of line) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        };

        const columns = parseRow(lines[0]);
        const data = lines.slice(1).map(line => {
            const values = parseRow(line);
            const obj: Record<string, unknown> = {};
            columns.forEach((col, i) => {
                obj[col] = values[i] || '';
            });
            return obj;
        });

        return {
            success: true,
            data,
            columns,
            rowCount: data.length,
            source: `Google Sheets: ${sheetId}`,
            fetchedAt: new Date()
        };
    }
}

/**
 * REST API Connector
 * 
 * Connects to generic JSON REST APIs
 */
export class RestApiConnector {
    private defaultHeaders: Record<string, string>;

    constructor(headers: Record<string, string> = {}) {
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            ...headers
        };
    }

    /**
     * Fetch data from a REST API endpoint
     */
    async fetch(
        url: string,
        options: {
            method?: 'GET' | 'POST';
            headers?: Record<string, string>;
            body?: Record<string, unknown>;
            dataPath?: string; // JSON path to data array, e.g., "data.items"
        } = {}
    ): Promise<ConnectorResult> {
        const { method = 'GET', headers = {}, body, dataPath } = options;

        try {
            const response = await fetch(url, {
                method,
                headers: { ...this.defaultHeaders, ...headers },
                body: body ? JSON.stringify(body) : undefined
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const json = await response.json();

            // Extract data from specified path or use root
            let data: Record<string, unknown>[] = json;

            if (dataPath) {
                const parts = dataPath.split('.');
                let current: unknown = json;
                for (const part of parts) {
                    if (current && typeof current === 'object' && part in current) {
                        current = (current as Record<string, unknown>)[part];
                    } else {
                        current = null;
                        break;
                    }
                }
                data = Array.isArray(current) ? current : [];
            } else if (!Array.isArray(data)) {
                // Try common patterns
                if (json.data && Array.isArray(json.data)) data = json.data;
                else if (json.items && Array.isArray(json.items)) data = json.items;
                else if (json.results && Array.isArray(json.results)) data = json.results;
                else data = [json]; // Wrap single object
            }

            // Extract columns from first row
            const columns = data.length > 0 ? Object.keys(data[0]) : [];

            return {
                success: true,
                data,
                columns,
                rowCount: data.length,
                source: new URL(url).hostname,
                fetchedAt: new Date()
            };
        } catch (error) {
            return {
                success: false,
                data: [],
                columns: [],
                rowCount: 0,
                source: url,
                fetchedAt: new Date(),
                error: error instanceof Error ? error.message : 'Failed to fetch API'
            };
        }
    }
}

/**
 * SQL Database Connector (via backend proxy)
 * 
 * Sends queries to the FastAPI backend which executes them securely
 */
export class SqlConnector {
    private backendUrl: string;

    constructor(backendUrl: string = 'http://localhost:8000') {
        this.backendUrl = backendUrl;
    }

    /**
     * Execute a SQL query via backend
     */
    async query(
        connectionId: string,
        sql: string
    ): Promise<ConnectorResult> {
        try {
            const response = await fetch(`${this.backendUrl}/api/sql/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    connection_id: connectionId,
                    query: sql
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Query failed');
            }

            const result = await response.json();

            return {
                success: true,
                data: result.data || [],
                columns: result.columns || [],
                rowCount: result.row_count || 0,
                source: `SQL: ${connectionId}`,
                fetchedAt: new Date()
            };
        } catch (error) {
            return {
                success: false,
                data: [],
                columns: [],
                rowCount: 0,
                source: `SQL: ${connectionId}`,
                fetchedAt: new Date(),
                error: error instanceof Error ? error.message : 'Query failed'
            };
        }
    }

    /**
     * Test database connection
     */
    async testConnection(connectionId: string): Promise<{ success: boolean; message: string }> {
        try {
            const response = await fetch(`${this.backendUrl}/api/sql/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ connection_id: connectionId })
            });

            const result = await response.json();
            return {
                success: response.ok,
                message: result.message || (response.ok ? 'Connected' : 'Failed')
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Connection failed'
            };
        }
    }
}

/**
 * Unified Data Connector Manager
 */
class DataConnectorManager {
    private sheets: GoogleSheetsConnector;
    private rest: RestApiConnector;
    private sql: SqlConnector;

    constructor() {
        this.sheets = new GoogleSheetsConnector();
        this.rest = new RestApiConnector();
        this.sql = new SqlConnector();
    }

    /**
     * Connect to a data source
     */
    async connect(config: ConnectorConfig): Promise<ConnectorResult> {
        switch (config.type) {
            case 'google-sheets':
                if (!config.url) throw new Error('URL required for Google Sheets');
                return this.sheets.fetch(config.url);

            case 'rest-api':
                if (!config.url) throw new Error('URL required for REST API');
                return this.rest.fetch(config.url);

            case 'sql':
                return this.sql.query(config.name, 'SELECT 1'); // Test query

            default:
                throw new Error(`Unknown connector type: ${config.type}`);
        }
    }

    /**
     * Get connector by type
     */
    getConnector(type: 'google-sheets'): GoogleSheetsConnector;
    getConnector(type: 'rest-api'): RestApiConnector;
    getConnector(type: 'sql'): SqlConnector;
    getConnector(type: ConnectorConfig['type']): GoogleSheetsConnector | RestApiConnector | SqlConnector {
        switch (type) {
            case 'google-sheets': return this.sheets;
            case 'rest-api': return this.rest;
            case 'sql': return this.sql;
        }
    }
}

// Singleton instance
export const dataConnectors = new DataConnectorManager();

export default dataConnectors;
