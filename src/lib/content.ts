export type Article = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  sections: { id?: string; heading: string; paragraphs: string[]; bullets?: string[] }[];
};
export const PAGES: Article[] = [
  {
    slug: "about",
    title: "A quieter way to work with PDFs",
    description:
      "PDFORGE is a free-to-use PDF toolkit with private application source, local browser processing, static hosting and clear feature limitations.",
    eyebrow: "ABOUT PDFORGE",
    intro:
      "Useful tools. No account to manage. No document-upload queue. Just a little less friction between you and your next task.",
    sections: [
      {
        heading: "Built around the everyday",
        paragraphs: [
          "PDFORGE brings 30 focused document tools into a single browser workspace: combining pages, shrinking files, making simple conversions, adding a signature, and preparing documents to share. All tools are free to use; there is no premium tier or PDFORGE watermark added to your output.",
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
