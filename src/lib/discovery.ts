import type { ToolDef } from "./tools";
export type DiscoveryEntry = {
  title?: string;
  description?: string;
  usefulFor: string;
  produces: string;
  watchFor: string;
  next?: { slug: string; label: string; reason: string }[];
  guide?: { slug: string; label: string };
};
export const DISCOVERY: Record<string, DiscoveryEntry> = {
  merge: {
    title: "Merge PDF Files — Free Browser PDF Merger",
    description:
      "Merge PDF files in your chosen order without uploading documents. Download one combined PDF free, then verify page order and any existing signatures.",
    usefulFor:
      "Combine separate reports, scanned pages or supporting documents into one PDF. Put the files in final reading order before processing; the file list, not the original filenames, determines the merged sequence.",
    produces:
      "One PDF containing the selected files' pages in order. The operation copies page content rather than deliberately converting every page to an image.",
    watchFor:
      "Interactive forms, bookmarks, portfolios and existing signatures may not survive merging. Unlock encrypted inputs with a password you know first. Review the first/last page of each original in the combined result.",
    next: [
      {
        slug: "organize",
        label: "Organize PDF pages",
        reason: "Reorder, rotate or remove individual pages after combining files.",
      },
      {
        slug: "page-numbers",
        label: "Add page numbers",
        reason: "Number the final merged document after its order is settled.",
      },
    ],
  },
  split: {
    title: "Split PDF — Free Page Ranges or Individual Pages",
    description:
      "Split a PDF into individual pages or page ranges in your browser. Files stay on your device; review the resulting PDFs and download them free.",
    usefulFor:
      "Separate chapters, invoices or selected sections from a larger document. Use individual-page mode when every page needs its own file, or comma-separated groups such as 1-3,4-6 for sections.",
    produces:
      "Separate PDF documents for the requested groups, with individual and ZIP download options when several results are produced.",
    watchFor:
      "A split is not a security operation: copied pages can retain visible content and document features. Check every range and keep the original. To produce one selected-page document, use Extract pages instead.",
    next: [
      {
        slug: "extract-pages",
        label: "Extract PDF pages",
        reason: "Keep a chosen sequence together in one new file.",
      },
      {
        slug: "remove-pages",
        label: "Remove PDF pages",
        reason: "Keep most of a document while excluding selected pages.",
      },
    ],
  },
  organize: {
    usefulFor:
      "Fix reading order, rotate a sideways page or remove an unwanted page using the preview and labeled controls. This changes the page sequence; it does not edit text inside a page.",
    produces: "One PDF in the displayed page order with selected rotations and deletions applied.",
    watchFor:
      "Review every thumbnail before downloading. Deleting every page is rejected. Page operations can invalidate existing signatures and affect interactive document features.",
    next: [
      {
        slug: "merge",
        label: "Merge PDFs",
        reason: "Combine separate input documents before organizing their pages.",
      },
    ],
  },
  "extract-pages": {
    usefulFor:
      "Create one new document from a sequence such as 3,1,5-7. This is useful for a packet that needs only a few source pages, in a deliberate order.",
    produces:
      "One PDF containing the requested pages. Page order follows the selection; it is not the same as splitting each range into a separate output.",
    watchFor:
      "Use valid page numbers and inspect the new sequence. Extracting pages is not redaction or removal of hidden objects from the retained pages.",
    next: [
      {
        slug: "split",
        label: "Split PDF",
        reason: "Produce multiple separate files instead of a single selected-page file.",
      },
    ],
  },
  "remove-pages": {
    usefulFor:
      "Remove blank sheets, duplicated covers or pages that should not be included while keeping the remaining pages in their current sequence.",
    produces:
      "A new PDF without the selected page numbers. The untouched input file remains on your device.",
    watchFor:
      "The app rejects a selection that would remove every page. Removing a page does not find or remove repeated sensitive information elsewhere in the document.",
    next: [
      {
        slug: "redact",
        label: "Redact sensitive regions",
        reason:
          "Remove selected visible information from retained pages using a destructive rebuild.",
      },
    ],
  },
  rotate: {
    usefulFor:
      "Correct portrait/landscape orientation in sideways documents. Use this tool to apply a consistent turn to a file or batch; Organize provides per-page rotation controls.",
    produces:
      "PDF output with page rotations applied without intentionally rasterizing source content.",
    watchFor:
      "Rotation does not change or sanitize the text/images on a page. Existing digital signatures may no longer validate after saving an edited copy.",
    next: [
      {
        slug: "organize",
        label: "Rotate selected pages",
        reason: "Use page-level controls when only some pages are sideways.",
      },
    ],
  },
  compress: {
    title: "Compress PDF — Lossless First, No Document Upload",
    description:
      "Compress PDF files locally with measured input/output sizes. Lossless is the default; image-based modes are optional and the original is kept if smaller.",
    usefulFor:
      "Try to reduce a document for sharing while keeping selectable text. Start with the lossless mode; use an image mode only when you accept a visual-only rebuild.",
    produces:
      "The smallest measured candidate available for the chosen operation. If no candidate beats the input size, the original is retained and the result says so.",
    watchFor:
      "No honest compressor can guarantee a fixed reduction for every PDF. Already optimized files may not shrink. Image modes can remove text search, forms, links and signatures; review text legibility at normal zoom.",
    guide: {
      slug: "compress-without-losing-text",
      label: "Compression without losing selectable text",
    },
    next: [
      {
        slug: "split",
        label: "Split a large PDF",
        reason: "Send only the needed section when optimization cannot reduce enough.",
      },
    ],
  },
  repair: {
    usefulFor:
      "Attempt structural recovery when a PDF has damaged cross-references or similar readable-file problems. This is recovery of available structure, not recreation of missing content.",
    produces:
      "A rebuilt PDF if the local engine can recover enough information. Unrecoverable files return an error rather than blank pages labeled as success.",
    watchFor:
      "Review every page and keep the original. A successfully parsed/rebuilt file can still have missing or visually wrong content. Repair is not malware scanning or certification.",
    next: [
      {
        slug: "pdf-to-png",
        label: "Render PDF pages",
        reason: "Visually inspect readable pages after a repair.",
      },
    ],
  },
  "pdf-to-jpg": {
    usefulFor:
      "Create JPEG page images for slides, previews or image-only sharing. Choose only needed pages and a suitable rendering scale instead of making unnecessarily large images.",
    produces: "JPEG images of rendered PDF pages, with a bundle option for multiple pages.",
    watchFor:
      "JPEG is lossy and is not a Word/editable-text format. A rendered page can reveal everything visible in the PDF, including information outside a crop if the source/view settings differ. Review the exact output.",
    guide: { slug: "pdf-to-jpg-or-png", label: "Choose JPG versus PNG for PDF pages" },
    next: [
      {
        slug: "pdf-to-png",
        label: "PDF to PNG",
        reason: "Prefer lossless image output for crisp lines/text when file size permits.",
      },
    ],
  },
  "pdf-to-png": {
    usefulFor:
      "Export crisp page images for diagrams, screenshots or text-heavy pages where lossless image encoding is useful.",
    produces:
      "PNG images of selected rendered pages. Higher scale increases pixels, memory and output size.",
    watchFor:
      "PNG does not preserve editable PDF text or document structure. Rendering/pixel budgets apply; a large format can reach device limits well before the file-byte limit.",
    guide: { slug: "pdf-to-jpg-or-png", label: "PDF image format and scale choices" },
    next: [
      {
        slug: "extract-images",
        label: "Extract embedded raster images",
        reason: "Recover supported image objects instead of rendering whole pages.",
      },
    ],
  },
  "jpg-to-pdf": {
    title: "JPG, PNG & WebP to PDF — Free Local Image Converter",
    description:
      "Turn JPG, PNG and WebP images into a PDF without uploading them. Choose fit/A4 pages, orientation and margins, then check the image order and download.",
    usefulFor:
      "Collect photos or page scans into one PDF. Arrange images before conversion and choose whether to fit each image or use a standard page size.",
    produces:
      "A PDF containing the chosen raster images, with orientation and margin settings applied. JPEG EXIF orientation is handled by image normalization.",
    watchFor:
      "This does not recognize text. Scanned words remain images until OCR is run. Image headers, megapixel limits and aggregate memory budgets are checked; SVG/TIFF/HEIC are not advertised inputs.",
    next: [
      {
        slug: "ocr",
        label: "Recognize text in scans",
        reason: "Create searchable text/PDF output from suitable English or Hindi scans.",
      },
    ],
  },
  "pdf-to-word": {
    title: "PDF to Word Converter — Free Structured DOCX, No Upload",
    description:
      "Convert selectable PDF text to a structured Word DOCX in your browser. Headings and simple tables are detected; complex layouts and images are simplified.",
    usefulFor:
      "Recover editable paragraphs from a text-based PDF when document confidentiality matters more than matching every layout detail. The output is genuine DOCX with detected headings, simple tables and styling, not a renamed PDF or a page-image slideshow.",
    produces:
      "A structured Word-compatible OOXML .docx file with headings, simple text tables, lists and bold/italic runs. The public synthetic before/after sample below demonstrates a simple text case; it does not prove complex-layout fidelity.",
    watchFor:
      "Simple text tables are detected but complex layouts can shift: charts, original images and fonts are not reconstructed, multi-column reading order can be wrong, and a scanned or textless PDF needs OCR first. Password-encrypted input needs an opening/owner password you already know; this is not password recovery.",
    guide: {
      slug: "pdf-to-word-without-upload",
      label: "PDF to Word without uploading: what stays editable?",
    },
    next: [
      {
        slug: "ocr",
        label: "OCR scanned pages first",
        reason: "Download a searchable PDF, review recognized text, then convert that PDF to DOCX.",
      },
      {
        slug: "pdf-to-text",
        label: "Extract plain text",
        reason: "Choose UTF-8 text when Word formatting is unnecessary.",
      },
      {
        slug: "unlock",
        label: "Unlock with a known password",
        reason: "Prepare an encrypted input you are authorized to open.",
      },
    ],
  },
  "word-to-pdf": {
    title: "Word to PDF Converter — Free Text & Visual Modes",
    description:
      "Convert DOCX to a searchable text-first PDF locally, or choose image-based visual mode. Complex Office layouts are simplified; no uploads, free.",
    usefulFor:
      "Create a shareable searchable PDF from supported .docx paragraphs, lists, tables and embedded PNG/JPEG images without sending the document to a conversion API. Switch to visual mode when appearance matters more than selectable text.",
    produces:
      "Searchable text-first PDF pages by default, with simplified layout. Image-based visual mode is available when appearance matters more than selectable text. Neither mode is native Microsoft Word rendering.",
    watchFor:
      "Legacy .doc and macro-enabled documents are not supported. Headers, footers, floating objects, fonts and complex layouts can differ. Compare the complete result with the original before sharing.",
    next: [
      {
        slug: "ocr",
        label: "Make a visual PDF searchable",
        reason: "Recognize supported English/Hindi text after reviewing the rendered conversion.",
      },
    ],
  },
  "pdf-to-text": {
    usefulFor:
      "Copy selectable PDF text into a plain-text document for reading, editing or a text-only workflow without producing a Word file.",
    produces:
      "UTF-8 text with page separators, based on available PDF text and positional reading-order heuristics.",
    watchFor:
      "Scans need OCR first. Multi-column pages, unusual encodings and reading order can require editing; extraction does not verify the accuracy or legal meaning of the source.",
    next: [
      {
        slug: "pdf-to-word",
        label: "Export editable DOCX",
        reason: "Use a Word-compatible container instead of plain text.",
      },
      {
        slug: "ocr",
        label: "OCR image-only pages",
        reason: "Recognize English/Hindi words that do not already exist as selectable text.",
      },
    ],
  },
  "text-to-pdf": {
    usefulFor:
      "Create simple searchable PDF pages from typed text or a UTF-8 text file. This is a text-document creator, not a full page-layout application.",
    produces:
      "PDF pages with embedded/selectable text using supported bundled fonts. Latin and Devanagari examples are covered by the release tests.",
    watchFor:
      "Unsupported glyphs/scripts/emoji can be rejected rather than silently disappearing. Use the source text and review line breaks; there is no rich HTML/Office layout reconstruction.",
    next: [
      {
        slug: "page-numbers",
        label: "Number the resulting pages",
        reason: "Add consistent numbering after the document is created.",
      },
    ],
  },
  "page-numbers": {
    usefulFor:
      "Add a consistent numbering sequence to a finished packet. Choose placement, start number, size and optional total before processing.",
    produces:
      "A PDF with visible added numbers; existing page content is retained rather than deliberately rasterized.",
    watchFor:
      "Check margins so numbers do not cover source text. Numbering edits can invalidate existing certificate-backed signatures.",
    next: [
      {
        slug: "merge",
        label: "Merge first",
        reason: "Finalize file/page order before adding a continuous numbering sequence.",
      },
    ],
  },
  watermark: {
    usefulFor:
      "Place a visible text label such as a draft/confidential marker with controlled position, size, angle and opacity.",
    produces:
      "A PDF with a text overlay. This is visible labeling, not removal/encryption of underlying information.",
    watchFor:
      "A watermark is not DRM or redaction. It does not prevent copying, prove identity or make a document safe to disclose.",
    next: [
      {
        slug: "protect",
        label: "Encrypt with an opening password",
        reason: "Use password protection when confidentiality—not visible labeling—is required.",
      },
      {
        slug: "redact",
        label: "Remove sensitive regions",
        reason: "Rebuild selected content instead of merely covering it with a label.",
      },
    ],
  },
  sign: {
    usefulFor:
      "Place a typed or drawn signature image where an ordinary visual electronic signature is appropriate for your workflow.",
    produces:
      "A PDF bearing a visible signature image on the selected page/corner. Signature state is cleared with the workspace.",
    watchFor:
      "This does not issue a signing certificate, verify signer identity, provide a trusted timestamp or create a certified audit trail. Legal suitability depends on jurisdiction and context.",
    next: [
      {
        slug: "flatten",
        label: "Flatten filled forms",
        reason:
          "Make supported form appearances static when that is the intended workflow, keeping an original copy.",
      },
    ],
  },
  protect: {
    usefulFor:
      "Encrypt a PDF with an opening password you choose. Use a unique strong passphrase and share it through a separate trusted channel.",
    produces:
      "A real AES-256 encrypted PDF using the bundled qpdf engine, not a client-side download password or a ZIP disguise.",
    watchFor:
      "The app has no password recovery service. Format limits include 127 UTF-8 bytes; PDF permission flags are not DRM. Keep an accessible original and test the new password.",
    next: [
      {
        slug: "unlock",
        label: "Remove encryption with a known password",
        reason: "Use a credential you already have; this tool does not guess missing passwords.",
      },
    ],
  },
  unlock: {
    usefulFor:
      "Remove PDF encryption when you know an opening or owner password and are authorized to process the document.",
    produces:
      "An unencrypted PDF copy if the provided password is accepted. Keep the encrypted original if it is still required for your records.",
    watchFor:
      "Unlock is not cracking, brute force or recovery without a credential. Do not use a tool promising invisible authorization bypass; ask the document owner for access instead.",
    next: [
      {
        slug: "pdf-to-word",
        label: "Convert readable text to Word",
        reason: "Convert the authorized unencrypted copy if it contains selectable text.",
      },
    ],
  },
  crop: {
    usefulFor:
      "Adjust visible page boundaries to reduce margins or focus a document view, using PDF point measurements.",
    produces: "A PDF with changed crop boundaries, not a security-sanitized file.",
    watchFor:
      "Content outside the crop can remain recoverable. Never use cropping to conceal sensitive text, images or account details.",
    guide: {
      slug: "redaction-is-not-a-black-box",
      label: "Why crop/cover is not permanent redaction",
    },
    next: [
      {
        slug: "redact",
        label: "Permanently redact selected regions",
        reason: "Use a destructive page rebuild when information must be removed.",
      },
    ],
  },
  resize: {
    usefulFor:
      "Fit pages into a standard paper size such as A4, Letter, Legal or A3, with an appropriate orientation.",
    produces: "A PDF with source page content placed into the selected page geometry.",
    watchFor:
      "Resizing is not content editing, OCR or metadata sanitization. Review the result at the intended print size, including source pages that were already rotated.",
    next: [
      {
        slug: "rotate",
        label: "Correct page rotation",
        reason: "Fix orientation separately when changing paper size is not the real problem.",
      },
    ],
  },
  flatten: {
    usefulFor:
      "Make supported filled AcroForm field appearances part of the static page content so the form is no longer an editable field collection.",
    produces:
      "A flattened PDF copy. Keep the editable original if you may need to change responses later.",
    watchFor:
      "Not every interactive technology is AcroForm. Flattening is not a legal-signature certification or removal of every attachment/action/hidden object.",
    next: [
      {
        slug: "sanitize",
        label: "Rebuild visible pages only",
        reason:
          "Use image-only sanitization for a different, more destructive hidden-object-removal workflow.",
      },
    ],
  },
  redact: {
    title: "Redact PDF Permanently — Local Raster Rebuild",
    description:
      "Redact selected PDF regions locally by rebuilding all pages as images. Original source objects are not copied; review every region before sharing the result.",
    usefulFor:
      "Remove selected visible sensitive regions before disclosure when an image-only result is acceptable. Cover every occurrence, including repeated page content and glyph edges.",
    produces:
      "A freshly rebuilt image-only PDF. Selected pixels are covered before embedding new page images; original text, source image objects, metadata, attachments and forms are not copied.",
    watchFor:
      "This loses searchability/forms/signatures and is not certified legal redaction. Human selection and independent output review are essential. Crop, a black overlay or a watermark is not the same operation.",
    guide: {
      slug: "redaction-is-not-a-black-box",
      label: "How destructive redaction differs from crop/cover",
    },
    next: [
      {
        slug: "sanitize",
        label: "Sanitize without region covers",
        reason:
          "Rebuild visible pages to remove inspected hidden source structures while keeping visible information.",
      },
    ],
  },
  ocr: {
    title: "OCR PDF & Images — English and Hindi, No Upload",
    description:
      "Recognize English/Hindi scans locally and download text plus a searchable PDF. Review names and numbers; OCR needs device memory and is not perfect accuracy.",
    usefulFor:
      "Recognize printed English/Hindi text in scans or supported image files. Choose the actual language, then check important names, amounts and dates against the visible original.",
    produces:
      "A text file and a genuine searchable PDF from the local Tesseract engine. Recognition confidence is a model output, not an accuracy guarantee.",
    watchFor:
      "Poor scans, handwriting, unusual typefaces and unsupported languages can fail or produce wrong words. A searchable OCR layer does not make a fully tagged accessible PDF. OCR/page/pixel budgets still apply.",
    guide: { slug: "scanned-pdf-to-word", label: "Scanned PDF to Word: OCR, review, then DOCX" },
    next: [
      {
        slug: "pdf-to-word",
        label: "Export recognized text to Word",
        reason: "Convert the reviewed searchable PDF into an editable text-focused DOCX.",
      },
    ],
  },
  metadata: {
    usefulFor:
      "Read/update standard title, author, subject and keywords, or clear standard information and XMP from a PDF copy.",
    produces:
      "A PDF with edited metadata fields. The document's visible page content is not changed by this operation.",
    watchFor:
      "Metadata clearing is not comprehensive hidden-content removal or redaction. Annotations, attachment names, source objects or visible text can still contain information.",
    next: [
      {
        slug: "sanitize",
        label: "Sanitize page images",
        reason:
          "Use a destructive rebuild when original hidden source objects should not be copied.",
      },
    ],
  },
  sanitize: {
    usefulFor:
      "Create a visual-only copy without retaining inspected original text/attachments/actions/metadata objects, when losing document interactivity is acceptable.",
    produces:
      "A new image-only PDF containing rendered page appearance rather than copied source page objects.",
    watchFor:
      "Visible secrets remain visible. This removes searchability/forms/signatures and is not an antivirus scan, content review or compliance certification.",
    next: [
      {
        slug: "redact",
        label: "Cover visible sensitive regions first",
        reason: "Use redaction when information can still be seen on a page.",
      },
    ],
  },
  compare: {
    usefulFor:
      "Find visual page changes between two PDFs by comparing rendered pixels. This helps a human review appearance differences.",
    produces:
      "A comparison report and visual difference maps. Identical renderings yield no changed pixels in the tested scenario.",
    watchFor:
      "Pixel differences can reflect fonts/rendering/antialiasing, not just meaningful edits. Invisible metadata or semantic/legal changes are not reliably detected by visual comparison.",
    next: [
      {
        slug: "metadata",
        label: "Inspect standard metadata",
        reason: "Review a different class of differences than rendered page appearance.",
      },
    ],
  },
  "extract-images": {
    usefulFor:
      "Recover supported embedded raster image objects when you need the image itself rather than a screenshot of the whole PDF page.",
    produces:
      "Decoded supported raster images, with bundle downloads when multiple images are found.",
    watchFor:
      "Vector artwork, text, masks, reused objects and unsupported codecs may not yield the expected original. This is not guaranteed recovery of every visual object or a license to reuse someone else's images.",
    next: [
      {
        slug: "pdf-to-png",
        label: "Render entire pages instead",
        reason: "Use page rendering when the visible artwork is not an extractable raster object.",
      },
    ],
  },
  "pdf-to-csv": {
    usefulFor:
      "Export selectable text into positional page/row/column/text records for further inspection in a spreadsheet or script.",
    produces:
      "A UTF-8 CSV based on text positions, with formula-leading cell values escaped for safer spreadsheet opening.",
    watchFor:
      "This is not reliable reconstruction of every table or verification of financial data. Reading order, columns and numbers can need manual correction; scans need OCR first.",
    next: [
      {
        slug: "ocr",
        label: "Recognize scans first",
        reason: "Create selectable text before attempting position-based CSV extraction.",
      },
    ],
  },
  "pdf-to-markdown": {
    title: "PDF to Markdown Converter — Free, No Upload",
    description:
      "Turn selectable PDF text into clean Markdown with headings, lists and tables. Runs locally in your browser; scans need OCR first.",
    usefulFor:
      "Prepare readable plain-text notes, documentation or LLM-ready input from a text-based PDF. Headings, lists and simple text grids become Markdown structure without sending the document anywhere.",
    produces:
      "A UTF-8 Markdown file with detected headings, bullet/numbered lists and pipe tables, separated by page markers.",
    watchFor:
      "Markdown keeps structure, not appearance: fonts, colors, images and exact layout are not preserved. Multi-column reading order can be wrong; scans need OCR first.",
    next: [
      {
        slug: "pdf-to-text",
        label: "Extract plain text",
        reason: "Choose unformatted text when Markdown structure is unnecessary.",
      },
      {
        slug: "summarize",
        label: "Summarize key sentences",
        reason: "Select the most representative sentences instead of converting everything.",
      },
    ],
  },
  "pdf-to-excel": {
    title: "PDF to Excel Converter — Free XLSX, No Upload",
    description:
      "Rebuild selectable PDF text grids as a genuine editable XLSX workbook locally. One sheet per page; review numbers before relying on them.",
    usefulFor:
      "Recover usable spreadsheet rows from a text-based PDF price list, report or statement. Each PDF page becomes a workbook sheet with positionally inferred columns.",
    produces:
      "A genuine OOXML .xlsx workbook with one sheet per PDF page. Numeric cells stay numeric; text uses shared strings so values can never execute as formulas.",
    watchFor:
      "This is positional grid reconstruction, not verified accounting data: merged cells, wrapped text and multi-column layouts can misalign columns. Review every number; scans need OCR first.",
    next: [
      {
        slug: "pdf-to-csv",
        label: "Export positional CSV",
        reason: "Choose a simpler text format when a workbook container is unnecessary.",
      },
      {
        slug: "ocr",
        label: "Recognize scans first",
        reason: "Create selectable text before attempting position-based extraction.",
      },
    ],
  },
  "excel-to-pdf": {
    title: "Excel to PDF Converter — Free, On Your Device",
    description:
      "Render an XLSX workbook into searchable PDF tables locally. Simplified styling; charts, images and macros are not supported.",
    usefulFor:
      "Create a shareable searchable PDF from an .xlsx workbook's worksheets without sending business data to a conversion API. Each sheet becomes titled tables in reading order.",
    produces:
      "Searchable PDF pages with one table section per worksheet, using stored cell values with simplified borders and styling.",
    watchFor:
      "XLSX only; legacy .xls and macro-enabled files are rejected. Merged cells, charts, images, print areas and custom number formats are simplified; dates use stored serial values.",
    next: [
      {
        slug: "pdf-to-excel",
        label: "Convert PDF tables to Excel",
        reason: "Rebuild workbook data from a text-based PDF in the other direction.",
      },
    ],
  },
  "fill-pdf-form": {
    title: "Fill PDF Form — Free, Private Form Filler",
    description:
      "Type values into a PDF's fillable AcroForm fields entirely on your device. Fields stay editable; flatten afterwards to lock them.",
    usefulFor:
      "Complete a fillable application, declaration or feedback PDF when the fields already exist. Text, checkbox and choice fields are listed with their current values for editing.",
    produces:
      "A PDF copy with the entered field values stored as real form data, with updated field appearances. The original file is not modified.",
    watchFor:
      "Only standard AcroForm fields are supported; XFA forms, flat scans and image-only pages have nothing to fill. Filled values stay editable until flattened; filling is not identity verification.",
    next: [
      {
        slug: "flatten",
        label: "Flatten filled forms",
        reason: "Make the entered values static page content after reviewing them.",
      },
      {
        slug: "sign",
        label: "Add a visual signature",
        reason: "Place a drawn or typed signature image after completing the fields.",
      },
    ],
  },
  summarize: {
    title: "Summarize PDF — Free Extractive Summary, No Upload",
    description:
      "Select a PDF's key sentences locally by word frequency. Honest extractive summarization with no cloud AI and no uploads.",
    usefulFor:
      "Get the gist of a long text-based report, article or policy document. The most representative existing sentences are selected on your device in three length options.",
    produces:
      "A UTF-8 text summary containing the selected key sentences in original order, plus a count of sentences considered.",
    watchFor:
      "Extractive selection is not comprehension: important nuance can be missed and nothing is fact-checked. Summaries reflect word frequency, not truth; scans need OCR first.",
    next: [
      {
        slug: "pdf-to-text",
        label: "Extract full text",
        reason: "Read everything when a frequency-based selection is not enough.",
      },
      {
        slug: "pdf-to-markdown",
        label: "Convert to Markdown",
        reason: "Keep full structured content for notes instead of a short summary.",
      },
    ],
  },
};
export function discoveryFor(tool: ToolDef) {
  return DISCOVERY[tool.slug];
}
