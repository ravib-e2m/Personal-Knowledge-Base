// Type declaration for the internal pdf-parse implementation file.
// We import 'pdf-parse/lib/pdf-parse.js' directly to bypass the package's
// debug code in index.js (which crashes under Next.js server bundling).
declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    text: string;
    version: string;
  }

  function pdfParse(
    dataBuffer: Buffer,
    options?: Record<string, unknown>
  ): Promise<PDFParseResult>;

  export default pdfParse;
}
