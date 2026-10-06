import { getDocumentProxy } from 'unpdf';

/**
 * One run of text on a PDF page, in the order the PDF draws it.
 *
 * pdf.js already resolves bidi per item, so `str` reads in logical order -
 * "מספר עובד: 796913", not its mirror image. x/y are in PDF points with the
 * origin bottom-left, which the roster parser needs to tell columns apart.
 */
export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Writing direction pdf.js resolved for the run. A Hebrew run's words are in logical order, right to left. */
  dir?: string;
}

/** Text items of every page, page by page, empty runs dropped. */
export async function readPdfTextItems(data: Uint8Array): Promise<PdfTextItem[][]> {
  const pdf = await getDocumentProxy(data);
  const pages: PdfTextItem[][] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    const items: PdfTextItem[] = [];
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      items.push({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height,
        dir: item.dir,
      });
    }
    pages.push(items);
  }
  return pages;
}

/** Bidi control marks some exports wrap around numbers; they never carry meaning. */
export function stripBidiMarks(text: string): string {
  return text.replace(/[‎‏‪-‮⁦-⁩]/g, '');
}
