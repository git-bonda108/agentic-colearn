declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PdfParseOptions {
    pagerender?: (pageData: any) => Promise<string> | string;
    max?: number;
  }
  interface PdfParseResult {
    numpages: number;
    text: string;
    info?: any;
    metadata?: any;
  }
  function pdfParse(buffer: Buffer, options?: PdfParseOptions): Promise<PdfParseResult>;
  export default pdfParse;
}
