export type Article = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  updated?: string;
  relatedTools?: string[];
  sections: { id?: string; heading: string; paragraphs: string[]; bullets?: string[] }[];
};
export const PAGES: Article[] = [
  {
    slug: "about",
    title: "A quieter way to work with PDFs",
    description:
      "PDFORGE is a free-to-use PDF toolkit with private application source, local browser processing, static hosting and clear feature limitations.",
    eyebrow: "ABOUT PDFORGE",
    updated: "2026-10-28",
    intro:
      "Useful tools. No account to manage. No document-upload queue. Just a little less friction between you and your next task.",
    sections: [
      {
        heading: "Built around the everyday",
        paragraphs: [
          "PDFORGE brings 38 focused document tools into a single browser workspace: combining pages, shrinking files, making simple conversions, adding a signature, and preparing documents to share. All tools are free to use; there is no premium tier or PDFORGE watermark added to your output.",
          "It is an alternative for common PDF tasks, not a claim to reproduce every feature of a desktop editor or another online service. Office conversion is simplified, OCR makes mistakes, and some damaged or unusual documents cannot be processed. Every tool explains its limits.",
        ],
      },
      {
        heading: "Local processing is the architecture",
        paragraphs: [
          "The website and its processing engines are static files. Your browser reads your selected documents, runs the operation, and makes downloads available. No PDFORGE document-processing API, database, account service or payment service is required.",
          "The host delivers public assets and may log normal web requests. Local processing does not make a compromised browser or device safe. Use trusted software and review sensitive results before sharing.",
        ],
      },
      {
        id: "software-license",
        heading: "Free to use. Privately maintained.",
        paragraphs: [
          "The PDFORGE application is free to use on the official service. Its application source is maintained in a private repository and is covered by a restricted-use license. Bundled open-source engines, fonts and other third-party components retain their own licenses and permissions.",
          "A private repository is not technical copy protection: browser-delivered code and assets can still be inspected. The application license restricts redistribution of original application material, not rights granted by third-party licenses. This release does not claim security certification, guaranteed compliance, perfect conversion or zero future defects.",
        ],
      },
      {
        heading: "Which project this page describes",
        paragraphs: [
          "This PDFORGE is the browser-tool project published under the Vikas-93257 GitHub account at this site's canonical URL. It is not an affiliation or endorsement from iLovePDF, Microsoft, Adobe or another product with a similar name.",
          "The original application is privately maintained and restricted-use, while independent open-source engines keep their own terms. No registered-company identity, public source availability, customer count or security certification is implied by the project name.",
        ],
      },
      {
        heading: "Free does not mean infinite hardware",
        paragraphs: [
          "The app has no daily-use quota. It does have safety limits: 100 MB per file, 300 MB total, 50 files, 150 rendered pages per run and 40 OCR pages. Pixel and output budgets also protect browser memory. Complex documents may reach memory limits sooner, especially on phones.",
          "Free static hosts have their own bandwidth, size, usage-policy and service-availability limits. Check your host’s terms if you deploy a public instance. No tool can promise unlimited infrastructure forever.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Your documents stay in your browser",
    description:
      "Read how PDFORGE processes files locally, what the host can see, how memory is cleared, and what local processing cannot protect against.",
    eyebrow: "PRIVACY, IN PLAIN ENGLISH",
    intro:
      "A document tool shouldn’t need to collect your documents. PDFORGE is built so it doesn’t have to.",
    sections: [
      {
        heading: "What the app does with your files",
        paragraphs: [
          "When you choose a file, the app reads it into browser memory. PDF editing, image rendering, encryption, text extraction and OCR run locally. The application does not send your document content, original filenames, passwords or extracted text to a processing server.",
          "OCR language models, fonts and engine code are public assets served by this same website. These assets load when needed. The app does not ask a cloud AI or translation service to inspect your documents.",
        ],
      },
      {
        heading: "What a web host can still see",
        paragraphs: [
          "Your browser requests pages, scripts, fonts and processing assets from the host. A host or its CDN can see ordinary request information such as your IP address, request time, asset path, browser headers and referrer, according to its own policies. These requests are not document uploads.",
          "The PDFORGE source includes no advertising, third-party analytics, tracking pixels, account system, tracking cookies or document-history service. A modified deployment or browser extension could behave differently; inspect the version you use.",
        ],
      },
      {
        heading: "Storage and clearing a session",
        paragraphs: [
          "The app keeps selected files and generated output in memory for the current page session. It does not intentionally save documents, passwords or output to cookies, localStorage, sessionStorage, IndexedDB or a service-worker cache. OCR model caching is disabled by the app.",
          "Use Clear workspace to release the app’s references and revoke its download URLs. Refreshing, navigating away or closing the page also ends that workspace. JavaScript cannot guarantee immediate forensic erasure of RAM, browser internals or an operating-system swap file.",
          "Downloads are saved wherever your browser chooses. Clearing PDFORGE does not delete those files, original source files, browser download history, screenshots, clipboard contents or backups managed by your device.",
        ],
      },
      {
        heading: "A few sensible precautions",
        paragraphs: [
          "For confidential work, use a trusted device, an up-to-date browser and a verified deployment. Avoid untrusted extensions and shared computers. Review all outputs, especially OCR, redaction and conversions. Local processing is a useful privacy boundary, not a guarantee against every threat.",
        ],
      },
    ],
  },
  {
    slug: "security",
    title: "Security without the marketing fog",
    description:
      "Understand PDFORGE encryption, redaction, sanitization, electronic signatures, conversion limits and safe handling of untrusted files.",
    eyebrow: "SECURITY & LIMITATIONS",
    intro:
      "Different PDF operations provide different protections. Here is what they actually do—and what they do not.",
    sections: [
      {
        heading: "Encryption and known-password unlocking",
        paragraphs: [
          "Protect uses the bundled qpdf engine to write an AES-256 encrypted PDF with an opening password. Use a unique, strong passphrase and keep it somewhere safe. The minimum is eight characters; the format supports at most 127 UTF-8 bytes. There is no password recovery service.",
          "Unlock uses an opening or owner password you already know. It does not guess passwords or bypass a missing credential. Only process documents you own or are authorized to access. PDF permission flags are not a substitute for strong encryption and responsible file sharing.",
        ],
      },
      {
        heading: "Permanent redaction is a destructive rebuild",
        paragraphs: [
          "Redact renders every page to a canvas, covers the selected regions there, and creates a fresh PDF containing only those new page images. Original text objects, images, attachments, forms, links and metadata are not copied into the output. The result is no longer text-searchable.",
          "The selection must completely cover every occurrence of sensitive information. Include the edges of glyphs, repeated content and information visible elsewhere. Preview, download and independently review the final document before disclosure. The app does not automatically detect secrets or certify legal redaction compliance.",
          "Crop is different: it changes the visible page boundary and leaves hidden content in the file. Watermarks are visual overlays. Neither is redaction.",
        ],
      },
      {
        heading: "Sanitize and metadata tools have different jobs",
        paragraphs: [
          "Sanitize makes a visual-only rebuilt PDF without source attachments, hidden objects, selectable text, forms or links. It preserves visible content; sensitive information that you can see will still be visible unless you redact it.",
          "Metadata editing changes or clears standard document information and XMP. It does not sanitize annotations, attachment names, page content or other hidden material. Use the appropriate tool rather than assuming every privacy operation is interchangeable.",
        ],
      },
      {
        heading: "A signature is not always a digital signature",
        paragraphs: [
          "The Sign tool places a drawn or typed signature image on a page. That is a visual electronic signature, not certificate-backed cryptographic signing, identity verification, a trusted timestamp or a tamper-evident audit trail. Its legal effect depends on the jurisdiction and surrounding process.",
          "Editing, merging, flattening or rasterizing a document can invalidate existing digital signatures. Keep the untouched original and verify any signed-document requirements before processing.",
        ],
      },
      {
        heading: "Conversions, compression and OCR",
        paragraphs: [
          "Lossless compression is the default and preserves page content. Image-based compression is optional and can flatten selectable text, forms, links and signatures. The app compares actual byte sizes and never intentionally returns a larger compression result than the input.",
          "PDF to Word creates editable text, not a faithful reconstruction of arbitrary page layouts. Word to PDF renders supported DOCX content as page images. PDF to CSV infers positional rows and columns, rather than rebuilding spreadsheets or validating financial tables.",
          "OCR is probabilistic. Names, amounts, dates, handwriting and poor scans need careful review. English and Hindi models are bundled locally; output confidence is not a guarantee of accuracy.",
        ],
      },
      {
        heading: "Limits and untrusted documents",
        paragraphs: [
          "Safety limits are 100 MB per file, 300 MB total, 50 files, 150 rendered pages per run and 40 OCR pages. Individual render canvases are capped at 16 million pixels; image inputs at 24 million pixels and 16,384 pixels per side. Aggregate raster/output budgets may require smaller batches. These are protective limits, not a promise that every file below them will fit in memory.",
          "Malformed, deeply nested, unusual or hostile PDFs may still exhaust resources or expose defects in a browser or engine. The app does not execute embedded PDF document JavaScript, rejects unsupported input formats and sanitizes rendered DOCX HTML, but it is not an antivirus scanner, a malware sandbox or an independently certified security product.",
          "Cancellation is immediate for disposable qpdf workers and is requested for OCR. Other work stops at the next cancellable step; a single main-thread operation may need to finish. No partial result is offered as a completed download.",
        ],
      },
      {
        heading: "Responsible issue reporting",
        paragraphs: [
          "If you self-host, publish a security contact or private reporting channel in your repository. Do not include confidential documents in public issues. A minimal synthetic file, reproduction steps, browser version and expected result are usually more useful. Keep dependencies and local engine assets updated together.",
        ],
      },
    ],
  },
  {
    slug: "accessibility",
    title: "Useful tools should be usable tools",
    description:
      "Keyboard controls, readable interfaces, reduced motion and accessible alternatives to drawing in PDFORGE, plus known accessibility limitations.",
    eyebrow: "ACCESSIBILITY",
    intro:
      "The interface is designed for more than one way of working. Accessibility remains an ongoing responsibility, not a badge that ends the work.",
    sections: [
      {
        heading: "Built into the interface",
        paragraphs: [
          "The site uses semantic headings, labeled controls, visible focus indicators, a skip-to-content link and keyboard-operable buttons. Search and category filters work without drag-and-drop. File and page order can be changed with labeled arrow buttons.",
          "Progress and errors are announced through live status or alert regions. Error text explains what to do next. Reduced-motion preferences disable nonessential animation and smooth scrolling. Text and controls reflow on smaller screens.",
        ],
      },
      {
        heading: "Alternatives to pointer-only actions",
        paragraphs: [
          "Choose file buttons are available alongside drag-and-drop. The signature tool supports typed names as well as drawing. The redaction tool provides page selection and percentage-coordinate fields so a region can be added without drawing with a pointer.",
          "You must still be able to identify and fully cover the information to redact. Coordinate entry is an interaction alternative, not automatic sensitive-content detection.",
        ],
      },
      {
        heading: "Known limitations",
        paragraphs: [
          "PDF previews and visual comparison maps are images. Their underlying document content is not recreated as an accessible webpage. Image-based conversions, sanitization and redaction can remove accessibility tags and selectable text from output PDFs. OCR adds machine-recognized text but does not create complete tagged-PDF accessibility.",
          "Automated accessibility checks cover common machine-detectable problems and cannot prove full WCAG conformance. Manual testing with assistive technology, real users and multiple browsers is still needed. This release does not claim independent accessibility certification.",
        ],
      },
      {
        heading: "Reporting a barrier",
        paragraphs: [
          "For a hosted copy, use its published operator support contact. A private source repository is not a public support channel. Describe the tool, control, browser, assistive technology and task you were trying to complete. Use synthetic documents rather than attaching private files to a public issue.",
        ],
      },
    ],
  },
  {
    slug: "licenses",
    title: "Built on good open-source work",
    description:
      "License information and attribution for PDFORGE, PDF.js, pdf-lib, qpdf, Tesseract, Noto fonts and other bundled dependencies.",
    eyebrow: "LICENSES & ACKNOWLEDGMENTS",
    intro:
      "A small toolkit stands on a lot of thoughtful engineering. These projects make local document processing possible.",
    sections: [
      {
        heading: "The application",
        paragraphs: [
          "PDFORGE 1.1 uses a restricted-use application license. Using the official tools is free; permission to redistribute, mirror or rehost the original application is not granted without separate written permission, except where applicable law provides otherwise. Incidental browser copies needed to use the service are allowed. The full application license is included in the downloadable notices below. Third-party packages, engines, language models and fonts are licensed separately; their permissions are not restricted by the application license.",
        ],
      },
      {
        heading: "Document and rendering engines",
        paragraphs: [
          "pdf-lib and its fontkit adapter provide PDF writing and font embedding. PDF.js provides page rendering and text extraction. qpdf, through the qpdf-wasm distribution, provides password encryption, decryption, structural recovery and lossless optimization.",
          "Tesseract.js, Tesseract core and the English and Hindi tessdata_fast models provide local OCR. JSZip builds download bundles. Mammoth reads supported DOCX content, DOMPurify sanitizes that HTML, html2canvas renders it, and docx creates editable Word files.",
        ],
      },
      {
        heading: "Interface, framework and fonts",
        paragraphs: [
          "Next.js and React provide the static application framework. Lucide supplies interface icons. The bundled Noto Sans and Noto Sans Devanagari fonts use the SIL Open Font License 1.1. Their license copies and source-asset hashes are distributed with the site.",
          "A generated third-party license inventory and bundled notices are linked below. Review the actual notices and upstream terms if you redistribute a modified build; this page is attribution, not legal advice.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "A few straightforward terms",
    description:
      "PDFORGE is a free-to-use PDF utility provided without warranties. Keep originals, review output and process only documents you are authorized to use.",
    eyebrow: "TERMS OF USE",
    intro:
      "Use the tools responsibly. Keep a backup. Review the result. The legal details of your documents remain your responsibility.",
    sections: [
      {
        heading: "Your files and your permission",
        paragraphs: [
          "Only process documents you own or are authorized to modify. You remain responsible for content, permissions, sharing decisions and any applicable laws. The app does not claim ownership of your files and does not need a license to upload them to a processing service, because there is no document-processing upload service in this application.",
        ],
      },
      {
        heading: "No guarantee of suitability",
        paragraphs: [
          "The application is provided as-is under its source license, without warranties of accuracy, availability, fitness for a particular purpose, legal compliance or defect-free operation. Keep originals and independent backups. Verify downloaded output before relying on it, especially for legal, medical, financial or identity documents.",
          "A visual electronic signature is not certificate-backed identity verification. OCR and conversions can contain errors. Redaction requires careful human selection and review. The tools are not legal or professional advice.",
        ],
      },
      {
        heading: "The host has its own terms",
        paragraphs: [
          "A deployment’s host may apply separate network, logging, availability and acceptable-use policies. Free infrastructure has quotas. These application terms do not override a host’s rules or promise unlimited free bandwidth.",
          "The original application is covered by a restricted-use license, not an open-source application license. Do not redistribute or rehost it without permission, except where applicable law permits. Separately licensed third-party components retain their own rights and obligations. Your own processed document content is not made subject to an application-code redistribution restriction.",
        ],
      },
    ],
  },
  {
    slug: "testing",
    title: "How PDFORGE checks its tools—and what tests cannot prove",
    description:
      "Inspect PDFORGE's test method, public synthetic PDF-to-Word sample, local-processing checks and known limitations. No fake ratings or security certification.",
    eyebrow: "TESTING & PUBLIC EXAMPLES",
    updated: "2026-10-30",
    intro:
      "Useful evidence should be inspectable without pretending that a passing suite makes every file safe or every conversion perfect.",
    relatedTools: ["pdf-to-word", "ocr", "compress", "redact"],
    sections: [
      {
        heading: "Real outputs, not renamed files",
        paragraphs: [
          "The release tests run the actual tools and inspect downloaded PDFs, images, ZIP members, DOCX XML, XLSX workbooks, Markdown, summaries and filled form values. Checks include PDF page order/count/geometry, selectable words, numeric spreadsheet cells, heading/table structure, summary word provenance, encryption/decryption with known test passwords, image orientation and comparison results. A success message or filename alone is not enough.",
          "Native qpdf/Poppler, Python zipfile and OCR provide additional output checks, including readable text-first table content, summary words drawn only from the source document and inspected source-object removal for destructive redaction/sanitization. These are synthetic fixtures, not customer documents.",
        ],
      },
      {
        heading: "A dated baseline, not a universal rating",
        paragraphs: [
          "The published 1.2 release's recorded verification included 104 passing unit cases, 267 browser cases across Chromium/Firefox/Linux WebKit and 39 native/output checks. Public-website reruns for 1.2 are pending deployment; the last completed public-host rerun is the 1.1 record of 76 Chromium cases and 30 native/output checks. These numbers describe that dated release and test corpus, not every possible document.",
          "The site does not fabricate user ratings, customer totals, endorsements, compliance badges or a 10/10 security score. Linux WebKit is engine coverage, not real-device Safari/iOS certification. Technical SEO lab scores are not Google rank, indexing or AI-recommendation guarantees.",
        ],
      },
      {
        heading: "Try the public PDF-to-Word sample",
        paragraphs: [
          "The PDF-to-Word page links a synthetic source PDF and the actual DOCX produced by the local converter. Open both and inspect the editable words and page boundaries. The example uses straightforward selectable text; it is not evidence that charts, original images, tables, multiple columns or every font will retain their layout.",
          "Sample document data is separately offered under CC0. Original application code remains privately maintained under its restricted-use license, and independent upstream libraries/fonts/models retain their own licenses.",
        ],
      },
      {
        heading: "What local processing does and does not protect",
        paragraphs: [
          "Selected documents are processed in browser memory, not sent to a PDFORGE processing API. Positive tool tests watch application requests for unexpected origins/document-upload methods, and workspace tests check reference/download cleanup. The static host still receives ordinary page/asset requests, including IP/browser headers.",
          "A compromised device, extension, browser, dependency or modified deployment can break this boundary. The app is not an antivirus, audited malware sandbox, security certification or promise of forensic RAM erasure.",
        ],
      },
      {
        heading: "Review outputs where failure matters",
        paragraphs: [
          "Keep originals. Verify OCR names/amounts/dates. Compare converted pages with the source. Cover every sensitive occurrence when redacting, then independently inspect the output. Crop is not redaction; a visual signature is not a certificate-backed digital signature; simple CSV is not verified accounting data.",
        ],
      },
    ],
  },
];
export const GUIDES: Article[] = [
  {
    slug: "compress-without-losing-text",
    title: "Compress a PDF without losing selectable text",
    description:
      "Understand lossless versus image-based PDF compression, compare actual bytes and choose a smaller file without accidentally flattening text.",
    eyebrow: "PRACTICAL PDF GUIDE",
    intro:
      "A smaller file is only useful if it still does the job. Start with lossless optimization, then decide whether image quality is worth trading away.",
    sections: [
      {
        heading: "Start with the right method",
        paragraphs: [
          "Open Compress PDF, select your document and leave the default Lossless option selected. The local qpdf engine reorganizes PDF structures and recompresses supported streams without turning the pages into images. Selectable text remains text.",
          "The app compares the actual output size with your input and keeps the original when no candidate is smaller. A result showing Original kept is honest: some PDFs are already efficient, particularly small text documents and previously optimized files.",
        ],
      },
      {
        heading: "When image-based modes help",
        paragraphs: [
          "Scans and image-heavy files can benefit from lower image resolution or quality. The optional image modes render pages into JPEG images and rebuild a PDF. This can make large scans smaller, but it can also remove selectable text, interactive forms, links, signatures and accessibility information.",
          "If you need searchability, try lossless first. For a scan, consider local OCR after image compression, then review the recognized text. Never assume a smaller PDF has preserved its original document structure.",
        ],
      },
      {
        heading: "A quick verification checklist",
        paragraphs: [
          "Download and reopen the output in an independent reader. Check page count and orientation, inspect fine print and diagrams, try selecting and searching text, and compare the byte sizes. Keep the original until you have confirmed the result is suitable.",
        ],
        bullets: [
          "Use lossless for text-heavy and signed-document workflows, while remembering any PDF rewrite may affect signatures.",
          "Use image modes only if you accept rasterization and possible quality loss.",
          "Split large documents before processing if your device runs out of memory.",
        ],
      },
    ],
  },
  {
    slug: "redaction-is-not-a-black-box",
    title: "Real redaction is more than a black rectangle",
    description:
      "Learn why covering text or cropping a PDF is not permanent redaction, and how a visual-only rebuild removes the original hidden content.",
    eyebrow: "PRACTICAL PDF GUIDE",
    intro:
      "If a person can remove an overlay or copy the text underneath it, the information was never really removed.",
    sections: [
      {
        heading: "Three operations that look similar",
        paragraphs: [
          "A watermark is a visual overlay. Crop changes a page boundary. Neither removes the underlying source material. They are useful layout tools, but they are not tools for permanently removing secrets.",
          "PDFORGE Redact uses a different approach: render the page, cover the selected pixels, and put only the resulting image into a new PDF. Original text, source images and hidden objects are not copied. All pages are rebuilt, including pages without selected regions.",
        ],
      },
      {
        heading: "Use it carefully",
        paragraphs: [
          "Choose a PDF in Redact. On each relevant page, drag a box that fully covers the sensitive area, or enter a region using percentages measured from the top-left of the visible page. Check every occurrence, including headers, footers, copies and repeated identifiers.",
          "Confirm the destructive conversion and apply the redaction. Download the output and inspect every page. Try extracting text in a separate reader; the original selectable text should not be present. Check the visible result for uncovered edges or sensitive information you did not select.",
        ],
      },
      {
        heading: "Understand the trade-off",
        paragraphs: [
          "The result is image-only, so searchability, tags, interactive forms, links and existing signatures are lost. This is a deliberate security-oriented trade-off, not a full-featured vector redaction engine or a compliance certification.",
          "Sanitize uses the same fresh-image principle without blacking out visible information. Use it for a visual-only copy, not as a replacement for selecting sensitive areas.",
        ],
      },
    ],
  },
  {
    slug: "make-scans-searchable",
    title: "Make a scanned PDF searchable with local OCR",
    description:
      "Turn an English or Hindi scan into a searchable PDF and text file using browser-based OCR, with practical quality and verification tips.",
    eyebrow: "PRACTICAL PDF GUIDE",
    intro:
      "A scanned page is usually a picture of text. OCR adds machine-recognized text so you can search and copy it—but it still needs a human check.",
    sections: [
      {
        heading: "Choose a clean source",
        paragraphs: [
          "Use a sharp, upright scan with even lighting and readable contrast. Straighten sideways pages with Rotate PDF first. Printed text generally works better than handwriting, decorative fonts, blurry photographs or densely structured tables.",
          "Open OCR PDF & images and select a PDF, JPG, PNG or WebP. Choose English, Hindi, or both. The engine and selected language data load from this site, and recognition runs on your device without a document-upload API.",
        ],
      },
      {
        heading: "Review both outputs",
        paragraphs: [
          "A completed run offers a searchable PDF and a UTF-8 text file. Open the PDF and search for a known word, then compare the extracted text with the scan. Check names, account numbers, decimal points, dates and punctuation particularly carefully.",
          "The displayed confidence is an engine estimate averaged over pages, not a probability that the whole document is correct. A high score can coexist with an important mistake. OCR does not validate calculations or infer legal meaning.",
        ],
      },
      {
        heading: "Keep the job manageable",
        paragraphs: [
          "OCR supports up to 40 pages in a run and may take time. Split long documents first, close other memory-heavy tabs and keep your device powered. The first run loads more assets than later page views. A current desktop browser is a better fit for larger jobs.",
          "An OCR text layer does not recreate a fully tagged, accessible PDF or a faithful editable Word layout. For editable text, you can follow OCR with PDF to Word and review the simplified result.",
        ],
      },
    ],
  },
];

GUIDES.push(
  {
    slug: "pdf-to-word-without-upload",
    title: "PDF to Word without uploading: what stays editable?",
    description:
      "Learn when browser-local PDF-to-Word conversion works, what the editable DOCX preserves, why layouts differ and how to check a public before/after sample.",
    eyebrow: "PRACTICAL PDF GUIDE",
    updated: "2026-10-28",
    relatedTools: ["pdf-to-word", "pdf-to-text", "ocr", "unlock"],
    intro:
      "A PDF can look like a document without storing the paragraphs, tables or reading order that a Word editor expects. Start by identifying what is actually in the file.",
    sections: [
      {
        heading: "Check whether the PDF contains selectable text",
        paragraphs: [
          "Open the PDF in a trusted reader and try selecting an ordinary sentence. If you can select and copy sensible words, a text-focused DOCX export can be useful. If you select only a page image—or copied text is blank—recognition may be needed first.",
          "For an encrypted document, use a password you already know and have permission to use. The Unlock tool does not recover a missing credential. PDF restrictions and document ownership still matter.",
        ],
      },
      {
        heading: "Convert into an editable DOCX",
        paragraphs: [
          "Open PDF to Word, choose the PDF, run the local converter and download the .docx result. There is no sign-up or document-processing upload. The current exporter writes genuine Word OOXML with editable extracted text and page breaks.",
          "It does not reconstruct arbitrary tables, original photographs/charts, fonts or complex page layout. Do not advertise or rely on a text-focused export as a perfect visual reproduction. If plain text is enough, PDF to text avoids an unnecessary Word container.",
        ],
      },
      {
        heading: "Inspect a before/after result, not a promise",
        paragraphs: [
          "Use the public synthetic pair on the PDF-to-Word page to inspect a simple case yourself. In your own output, check the beginning/end of each page, reading order, numbers, punctuation and non-Latin words. Compare against the untouched original before relying on it.",
          "If a document has multiple columns, unusual character encodings or text positioned letter by letter, extracted reading order can need editing. A valid DOCX file is not the same as preserved original layout.",
        ],
      },
      {
        heading: "What stays on your device",
        paragraphs: [
          "The application reads the file into browser memory and makes a download available. It does not send the document, original filename, password or extracted words to a conversion service. The host still sees the public pages/scripts/models/fonts your browser requests.",
          "Clear the workspace or close/navigate away when finished. That releases application references, not a guarantee of forensic erasure or deletion of files already downloaded to your device.",
        ],
      },
    ],
  },
  {
    slug: "scanned-pdf-to-word",
    title: "Scanned PDF to Word: OCR, review, then editable DOCX",
    description:
      "Use a clear local English/Hindi OCR workflow before PDF-to-Word export. Review recognition errors and understand searchable text versus reconstructed layout.",
    eyebrow: "PRACTICAL PDF GUIDE",
    updated: "2026-10-28",
    relatedTools: ["ocr", "pdf-to-word", "pdf-to-text"],
    intro:
      "A scanned page is often just an image. Converting its container to DOCX cannot recover words that have not first been recognized.",
    sections: [
      {
        heading: "Recognize the scan with the correct language",
        paragraphs: [
          "Open OCR PDF & images and choose the scan. Select English, Hindi or English + Hindi to match the content, then run local recognition. Download both the text and searchable PDF result. Public language models load from the same site; the document is processed on your device.",
          "Use a clear, upright scan where possible. Names, amounts, dates, handwriting and poor print can be recognized incorrectly. Confidence is a model output, not proof that the words are right.",
        ],
      },
      {
        heading: "Review before converting again",
        paragraphs: [
          "Read the recognized text against the visible scan and test selection/search in the OCR PDF. Do not treat a searchable layer as an independently verified transcript or a fully tagged accessible PDF.",
          "For critical content, correct errors in an appropriate editor and review the full result. Never assume that a second conversion repairs OCR mistakes.",
        ],
      },
      {
        heading: "Export the searchable PDF to Word",
        paragraphs: [
          "Open PDF to Word and choose the reviewed searchable PDF that OCR produced. Run the local exporter and download the editable text-focused DOCX. The two tools are separate steps; navigating between them does not keep a selected customer document in a shared server history.",
          "The result still does not reconstruct the original table/photo/layout structure. OCR creates recognized words, not original Word paragraphs or spreadsheets. For plain recognized words, the OCR text download may already be the simpler output.",
        ],
      },
      {
        heading: "Stay within actual device limits",
        paragraphs: [
          "OCR is capped at 40 pages per run and also has pixel/output/time budgets. File limits are 100 MB each and 300 MB per workspace, but a difficult document can reach device memory limits sooner. Split a large scan before recognition rather than expecting an unlimited cloud worker.",
        ],
      },
    ],
  },
  {
    slug: "pdf-to-jpg-or-png",
    title: "PDF to JPG or PNG: choose format and scale for the job",
    description:
      "Choose JPEG or PNG when rendering PDF pages, understand scale/pixel trade-offs and distinguish a page screenshot from extracting an original embedded image.",
    eyebrow: "PRACTICAL PDF GUIDE",
    updated: "2026-10-28",
    relatedTools: ["pdf-to-jpg", "pdf-to-png", "extract-images", "jpg-to-pdf"],
    intro:
      "A rendered PDF page and an embedded photograph are different outputs. Choose the operation before choosing a file extension.",
    sections: [
      {
        heading: "Use JPG for a smaller lossy page image",
        paragraphs: [
          "PDF to JPG renders selected pages as JPEG. This can be convenient for slides/previews or image-heavy content when some image-compression loss is acceptable. Increasing quality or scale can increase output bytes rather than making every file smaller.",
        ],
      },
      {
        heading: "Use PNG when lossless encoding matters",
        paragraphs: [
          "PDF to PNG renders page images with lossless encoding. It can be useful for line art and text-heavy screenshots, though output size and memory still depend on page dimensions and rendering scale.",
          "Neither format preserves PDF text selection, form fields or the editable structure of the original. An image output is not a Word conversion or an accessibility-tagged document.",
        ],
      },
      {
        heading: "Choose scale without exhausting memory",
        paragraphs: [
          "Select only needed pages and a scale suited to the final display/print use. The app enforces rendered-page/canvas/pixel/output budgets. File bytes alone do not measure how much memory a page needs when decoded.",
          "Download the output and inspect fine text/lines at the intended size. For multiple pages, verify the images' sequence and bundle contents rather than assuming a ZIP filename proves success.",
        ],
      },
      {
        heading: "Extract images when you need the raster object itself",
        paragraphs: [
          "Extract PDF images attempts to decode supported embedded raster objects at their native dimensions. It is different from rendering a whole page, and it will not turn arbitrary vector drawings or text into the original photograph.",
          "Document/image copyright still applies. A technical ability to extract or render an image is not permission to redistribute someone else's material.",
        ],
      },
    ],
  },
  {
    slug: "cloud-storage-setup",
    title: "Connect Google Drive, Dropbox or OneDrive without a server",
    description:
      "Enable optional client-side cloud import and export: register a least-privilege OAuth app, set a public client ID and keep document bytes out of any middleman.",
    eyebrow: "PRACTICAL PDF GUIDE",
    updated: "2026-10-30",
    intro:
      "Cloud buttons stay hidden until the site owner registers the provider apps. There is deliberately no shared PDFORGE OAuth client: your sign-in, tokens and files travel only between your browser and the provider you choose.",
    sections: [
      {
        heading: "How the connection works",
        paragraphs: [
          "Each provider uses OAuth 2.0 with PKCE, the public-client flow designed for browser apps. PDFORGE opens the provider's own sign-in page, receives a one-time code and exchanges it for tokens directly with the provider's token endpoint.",
          "Tokens live only in the tab's session storage and are cleared when you disconnect or close the tab. Google access is limited to files you open or create with the app, Dropbox needs file-content scopes on your app, and OneDrive is limited to the application's own folder.",
        ],
      },
      {
        heading: "Register the three provider apps",
        paragraphs: [
          "Google: create an OAuth client ID of type Web application in Google Cloud Console, add https://YOUR-SITE/oauth/callback/ as an authorized redirect URI and enable the Drive API. Only the drive.file scope is requested.",
          "Dropbox: create a scoped app in the Dropbox App Console with files.content.read and files.content.write permission, and add the same /oauth/callback/ redirect URI.",
          "OneDrive: register an app in Microsoft Entra, add the redirect URI as a single-page-application reply URL and grant the delegated Files.ReadWrite.AppFolder permission.",
        ],
      },
      {
        heading: "Publish the public client IDs",
        paragraphs: [
          "Set NEXT_PUBLIC_GOOGLE_CLIENT_ID, NEXT_PUBLIC_DROPBOX_CLIENT_ID and NEXT_PUBLIC_ONEDRIVE_CLIENT_ID as build-time values and redeploy. These identifiers are public by design; there is no client secret because PKCE replaces it.",
          "Providers you skip simply stay hidden in the interface. Users can still download to their device and upload to any cloud by hand.",
        ],
      },
      {
        heading: "What the provider still learns",
        paragraphs: [
          "Using a cloud connection necessarily tells that provider which files you open or save, when, and from which address. Document processing itself stays local, but the file transfer is between you and the provider under their terms.",
          "For maximum privacy, keep files on your device. Cloud buttons are a convenience for people who already store documents with these providers, not a recommendation to start.",
        ],
      },
    ],
  },
  {
    slug: "command-line-pipelines",
    title: "Script the same engine from your terminal",
    description:
      "Run every local tool and multi-step pipeline from Node with the pdforge CLI: batch files, override options, emit JSON and keep bytes on your machine.",
    eyebrow: "PRACTICAL PDF GUIDE",
    updated: "2026-10-30",
    intro:
      "The CLI wraps the exact engine the browser app uses. From your local copy of the application source, with Node 22 and dependencies installed, run npm run pdforge -- --help to start.",
    sections: [
      {
        heading: "Run one tool",
        paragraphs: [
          "Pass a tool slug, input files and an output directory: npm run pdforge -- compress report.pdf --out ./done. Names, notes and byte-identical outputs match the app; single-file tools accept one input exactly like the browser.",
          "Adjust behavior with --set key=value (compression, ranges, angle and every other documented option), --password for protect and unlock, --field name=value for form filling and --signature image.png for visual signatures. Unknown options and values are rejected rather than guessed.",
        ],
      },
      {
        heading: "Run a pipeline",
        paragraphs: [
          "Pass pipe plus a ready-made id or a comma-separated chain: npm run pdforge -- pipe split-and-flatten bundle.pdf --out ./pages, or npm run pdforge -- pipe sanitize,compress scan.pdf --out ./done --confirm. Pipelines map steps over every input file.",
          "Chains are compatibility-checked before anything runs, image-rebuilding steps need --confirm, and per-step notes are prefixed so logs stay attributable. OCR and visual Word mode need the browser engine and refuse with an explanation instead of failing halfway.",
        ],
      },
      {
        heading: "Automate with JSON and exit codes",
        paragraphs: [
          "Add --json for a machine-readable summary of written files, notes and pipeline stages, or --quiet to print only output paths. Exit 0 means success, 1 means usage error and 2 means processing failed.",
          "The same safety caps apply: 100 MB per file, 300 MB total and 50 files. The CLI makes no network calls at all — providers, fonts and models stay untouched.",
        ],
      },
    ],
  },
  {
    slug: "understanding-document-insight",
    title: "Understand any PDF before you touch it",
    description:
      "Document insight measures a PDF on your device: scanned pages, language guess, key topics, contact patterns and metadata — then suggests honest next steps.",
    eyebrow: "PRACTICAL PDF GUIDE",
    updated: "2026-10-30",
    intro:
      "Every tool page reads your selected PDF and reports plain facts about it. There is no AI model and no cloud call — just counting, pattern matching and PDF metadata, all on your device.",
    relatedTools: ["inspect", "ocr", "redact", "metadata"],
    sections: [
      {
        heading: "What the panel measures",
        paragraphs: [
          "Insight counts pages, words and characters, then checks each page for selectable text. Pages with almost no text are flagged as looking scanned, which tells you OCR is needed before any text-based tool can work properly.",
          "It also reads the stored title and author, counts fillable form fields, and counts email-shaped and phone-shaped patterns. Counts only: matches are never listed or sent anywhere.",
        ],
      },
      {
        heading: "How the guesses work",
        paragraphs: [
          "The language guess combines Unicode script detection with stopword voting across ten languages. Chinese, Japanese and Korean are recognized by script; distinctive scripts like Thai, Greek and Hebrew are reported directly. Short or jargon-heavy documents honestly report uncertain instead of guessing.",
          "Top topics come from word frequency after removing stopwords, and repeated two-word phrases are listed when they recur. A suggested filename is built from the stored title or the first substantial line of text.",
        ],
      },
      {
        heading: "Follow the suggested next steps",
        paragraphs: [
          "Suggestions are fixed rules, not recommendations from a model: scanned pages point to OCR, form fields to form filling, contact patterns to redaction, a missing title to metadata, large files to compression and long documents to splitting. At most three are shown.",
          "For a permanent record, run the Inspect tool: it writes the same findings as a Markdown report you can download, archive or attach to a ticket. Only the first 500,000 characters are analyzed, and the report says so when that cap applies.",
        ],
      },
    ],
  },
  {
    slug: "audit-ready-processing",
    title: "Prove what you processed, without an account",
    description:
      "Business-grade audit trails on a local-first toolkit: SHA-256 processing receipts, shareable settings preset packs and Bates-style numbering.",
    eyebrow: "PRACTICAL PDF GUIDE",
    updated: "2026-10-30",
    intro:
      "Regulated work needs proof, not promises. Every run can emit a receipt that binds inputs, outputs and settings together with hashes — generated on your device, with no account to subpoena.",
    relatedTools: ["page-numbers", "redact", "metadata", "inspect"],
    sections: [
      {
        heading: "Download a receipt for every run",
        paragraphs: [
          "After any single-tool run finishes, a receipt link appears under the result. The JSON records the app version, timestamp, tool, full settings, and every input and output with SHA-256 hashes. Passwords are recorded as withheld and signature images as byte counts, never content.",
          "The receipt attests that these outputs came from these inputs with these settings; it does not certify what the documents say. Anyone can re-hash the files and compare. From the terminal, add --receipt to single-tool and pipeline runs alike.",
        ],
      },
      {
        heading: "Share settings as preset packs",
        paragraphs: [
          "Name the current settings on any tool page to save them as a preset in that browser. Export a JSON pack per tool and send it to colleagues; importing reports exactly which presets were added and which entries were skipped and why.",
          "Packs carry settings only: files, passwords and signatures are never stored or exported. Unknown tools, unknown options and wrong value types are rejected per entry rather than silently dropped or applied.",
        ],
      },
      {
        heading: "Stamp Bates-style exhibit numbers",
        paragraphs: [
          "Page numbers accepts an optional prefix and zero-padding width, so EXH- with four digits stamps EXH-0001, EXH-0002 and onward — the exhibit labeling courts and discovery teams expect. Totals render the same way when enabled.",
          "Numbering is sequential within one run starting from your chosen number. For consecutive numbering across separate source files, merge first and number the combined document.",
        ],
      },
    ],
  },
  {
    slug: "redaction-logs-and-watch-folders",
    title: "Prove redactions and automate the routine",
    description:
      "Every redaction ships a region-by-region audit log, and the CLI watch mode processes hot folders unattended with per-file receipts.",
    eyebrow: "PRACTICAL PDF GUIDE",
    updated: "2026-10-30",
    intro:
      "Compliance is a paper trail plus a repeatable process. Redact now writes both parts: a human-readable log of what was burned, and a watch mode that applies vetted settings to every file that lands in a folder.",
    relatedTools: ["redact", "sanitize", "inspect", "page-numbers"],
    sections: [
      {
        heading: "Read the redaction log",
        paragraphs: [
          "Each redaction downloads two files: the rebuilt PDF and a Markdown log listing every region by page with left, top, width and height percentages plus the rebuild method and scale. The log is deterministic — the same input and settings always produce the same text in the app and the CLI.",
          "Percentages start at the top-left of the visible, rotated page, matching the editor. Keep the log with the disclosure file; it shows what was covered without embedding any document content.",
        ],
      },
      {
        heading: "Run a watch folder",
        paragraphs: [
          "From your local copy of the application source: npm run pdforge -- watch compress ./inbox --out ./done processes every PDF that lands in ./inbox with the same engine and limits as the app. Add --set key=value for vetted settings, --receipt for per-file audit receipts and --poll to tune the rescan interval.",
          "A file is picked up only after its size and modification time survive one full poll unchanged, so half-written uploads are never processed. Incompatible files are skipped with a logged reason while the folder keeps running; merge, compare and OCR are refused upfront because they need multiple files or the browser engine.",
        ],
      },
      {
        heading: "Mind the honest limits",
        paragraphs: [
          "Watch mode is stateless: it keeps no queue on disk, so restarting reprocesses the folder. Use separate input and output folders, and archive or move processed originals with your own scripts. --max-files N is provided for scheduled batches that should exit after N files.",
          "The log attests to regions, not to judgment: a box that misses a glyph edge is faithfully recorded and still wrong. Independent visual review of the rebuilt PDF remains mandatory before any disclosure.",
        ],
      },
    ],
  },
);
