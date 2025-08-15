/**
 * Declaración de tipos para csv-writer
 * Ya que no existe @types/csv-writer oficial
 */

declare module 'csv-writer' {
  export interface CsvStringifierOptions {
    header: {
      id: string;
      title: string;
    }[];
    fieldDelimiter?: string;
    recordDelimiter?: string;
    alwaysQuote?: boolean;
  }

  export interface ObjectCsvStringifier {
    getHeaderString(): string | null;
    stringifyRecords(records: any[]): string;
  }

  export function createObjectCsvStringifier(options: CsvStringifierOptions): ObjectCsvStringifier;
}
