export type ToolCategory = "organize" | "optimize" | "convert" | "edit" | "security";
export interface ToolDef {
  slug: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string;
  accept: "pdf" | "image" | "document" | "spreadsheet" | "presentation" | "text" | "pdf-image";
  multiple: boolean;
  cta: string;
  steps: string[];
  limitation: string;
  faqs: { q: string; a: string }[];
}
export const CATEGORIES: { id: ToolCategory; name: string; description: string }[] = [
  { id: "organize", name: "Organize", description: "Get every page in the right place." },
  { id: "optimize", name: "Optimize", description: "Smaller files. Cleaner documents." },
  { id: "convert", name: "Convert", description: "Move between useful formats." },
  { id: "edit", name: "Edit & sign", description: "Put your finishing touches on it." },
  { id: "security", name: "Secure", description: "Take control of sensitive information." },
];
export const TOOLS: ToolDef[] = [
  {
    slug: "merge",
    name: "Merge PDF",
    description: "Combine PDFs into one document, in the order you choose.",
    category: "organize",
    icon: "combine",
    accept: "pdf",
    multiple: true,
    cta: "Merge PDFs",
    steps: [
      "Choose your files. Nothing is uploaded.",
      "Arrange your files in the order you want.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Page content is copied. Interactive forms, bookmarks, portfolios and existing digital signatures may not survive merging.",
    faqs: [
      {
        q: "Is Merge PDF free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Page content is copied. Interactive forms, bookmarks, portfolios and existing digital signatures may not survive merging.",
      },
    ],
  },
  {
    slug: "split",
    name: "Split PDF",
    description: "Separate a PDF into page ranges or one file per page.",
    category: "organize",
    icon: "scissors",
    accept: "pdf",
    multiple: false,
    cta: "Split PDF",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Choose ranges such as 1-3, 5, 8-10, or split every page.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Ranges are one-based and inclusive. Each comma-separated group becomes a separate PDF.",
    faqs: [
      {
        q: "Is Split PDF free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Ranges are one-based and inclusive. Each comma-separated group becomes a separate PDF.",
      },
    ],
  },
  {
    slug: "organize",
    name: "Organize PDF",
    description: "Preview, reorder, rotate and delete pages visually.",
    category: "organize",
    icon: "layers",
    accept: "pdf",
    multiple: false,
    cta: "Save page order",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Move pages with the arrow buttons, rotate, or remove unwanted pages.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Keep at least one page. Keyboard-accessible buttons are available for every page action.",
    faqs: [
      {
        q: "Is Organize PDF free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Keep at least one page. Keyboard-accessible buttons are available for every page action.",
      },
    ],
  },
  {
    slug: "extract-pages",
    name: "Extract PDF pages",
    description: "Keep selected pages in a new, smaller PDF.",
    category: "organize",
    icon: "copy",
    accept: "pdf",
    multiple: false,
    cta: "Extract pages",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Enter the pages or ranges you want to keep.",
      "Process locally, review the result, and download your output.",
    ],
    limitation: "The selected pages become one new PDF, in your specified order.",
    faqs: [
      {
        q: "Is Extract PDF pages free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "The selected pages become one new PDF, in your specified order.",
      },
    ],
  },
  {
    slug: "remove-pages",
    name: "Remove PDF pages",
    description: "Delete unwanted covers, blank sheets or selected page ranges.",
    category: "organize",
    icon: "trash",
    accept: "pdf",
    multiple: false,
    cta: "Remove pages",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Enter the pages or ranges to delete.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "This removes complete pages, not sensitive text within a page. Use permanent redaction for sensitive areas.",
    faqs: [
      {
        q: "Is Remove PDF pages free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "This removes complete pages, not sensitive text within a page. Use permanent redaction for sensitive areas.",
      },
    ],
  },
  {
    slug: "rotate",
    name: "Rotate PDF",
    description: "Turn pages 90°, 180° or 270° without rasterizing them.",
    category: "organize",
    icon: "rotate",
    accept: "pdf",
    multiple: true,
    cta: "Rotate PDFs",
    steps: [
      "Choose your files. Nothing is uploaded.",
      "Choose an angle; all pages in each selected PDF will rotate.",
      "Process locally, review the result, and download your output.",
    ],
    limitation: "Rotation changes page orientation without converting the content to images.",
    faqs: [
      {
        q: "Is Rotate PDF free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Rotation changes page orientation without converting the content to images.",
      },
    ],
  },
  {
    slug: "compress",
    name: "Compress PDF",
    description: "Reduce size with real byte measurements and a text-preserving default.",
    category: "optimize",
    icon: "minimize",
    accept: "pdf",
    multiple: false,
    cta: "Compress PDF",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Choose lossless or explicitly opt into image-based compression.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Lossless keeps text, forms and vectors when possible. Image modes flatten pages and remove selectable text, links and form fields. The smallest acceptable candidate is kept.",
    faqs: [
      {
        q: "Is Compress PDF free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Lossless keeps text, forms and vectors when possible. Image modes flatten pages and remove selectable text, links and form fields. The smallest acceptable candidate is kept.",
      },
    ],
  },
  {
    slug: "repair",
    name: "Repair PDF",
    description: "Recover readable structure and rebuild broken cross-references.",
    category: "optimize",
    icon: "wrench",
    accept: "pdf",
    multiple: false,
    cta: "Repair PDF",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Run structural recovery on the damaged PDF.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Only recoverable page content can be repaired. Unrecoverable input is rejected; no replacement document is fabricated.",
    faqs: [
      {
        q: "Is Repair PDF free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Only recoverable page content can be repaired. Unrecoverable input is rejected; no replacement document is fabricated.",
      },
    ],
  },
  {
    slug: "pdf-to-jpg",
    name: "PDF to JPG",
    description: "Render PDF pages as high-quality JPEG images.",
    category: "convert",
    icon: "image",
    accept: "pdf",
    multiple: false,
    cta: "Convert to JPG",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Choose output resolution and the pages to render.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Creates page images, not the original embedded photographs. Use Extract images for embedded pictures.",
    faqs: [
      {
        q: "Is PDF to JPG free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Creates page images, not the original embedded photographs. Use Extract images for embedded pictures.",
      },
    ],
  },
  {
    slug: "pdf-to-png",
    name: "PDF to PNG",
    description: "Export crisp, lossless PNG images from PDF pages.",
    category: "convert",
    icon: "image",
    accept: "pdf",
    multiple: false,
    cta: "Convert to PNG",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Choose resolution and which pages to export.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "PNG is lossless but may be much larger than JPEG. Very large page dimensions are capped for browser safety.",
    faqs: [
      {
        q: "Is PDF to PNG free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "PNG is lossless but may be much larger than JPEG. Very large page dimensions are capped for browser safety.",
      },
    ],
  },
  {
    slug: "jpg-to-pdf",
    name: "Images to PDF",
    description: "Turn JPG, PNG and WebP images into a PDF with flexible page sizes.",
    category: "convert",
    icon: "file-image",
    accept: "image",
    multiple: true,
    cta: "Create PDF",
    steps: [
      "Choose your files. Nothing is uploaded.",
      "Set the image order, page size, margins and orientation.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "WebP is decoded locally and embedded as PNG. Animated images are treated as a still image. HEIC is not supported.",
    faqs: [
      {
        q: "Is Images to PDF free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "WebP is decoded locally and embedded as PNG. Animated images are treated as a still image. HEIC is not supported.",
      },
    ],
  },
  {
    slug: "pdf-to-word",
    name: "PDF to Word",
    description: "Convert selectable PDF text into a structured, editable DOCX file.",
    category: "convert",
    icon: "file-text",
    accept: "pdf",
    multiple: false,
    cta: "Convert to Word",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Create a Word document with detected headings, simple tables and text styling.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Headings, bordered and simple text tables, lists, bold/italic and embedded page images are detected; multi-column order, charts and original fonts are simplified. Run OCR first for scanned pages.",
    faqs: [
      {
        q: "Is PDF to Word free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Headings, bordered and simple text tables, lists, bold/italic and embedded page images are detected; multi-column order, charts and original fonts are simplified. Run OCR first for scanned pages.",
      },
    ],
  },
  {
    slug: "word-to-pdf",
    name: "Word to PDF",
    description: "Convert a DOCX locally into a searchable text-first PDF.",
    category: "convert",
    icon: "file-type",
    accept: "document",
    multiple: false,
    cta: "Convert to PDF",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Convert to searchable text by default, or choose the visual image-based mode.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "DOCX only, not legacy DOC. Text-first output is searchable with simplified layout; the optional visual mode renders page images instead. Complex Office layouts may differ in both modes.",
    faqs: [
      {
        q: "Is Word to PDF free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "DOCX only, not legacy DOC. Text-first output is searchable with simplified layout; the optional visual mode renders page images instead. Complex Office layouts may differ in both modes.",
      },
    ],
  },
  {
    slug: "pdf-to-text",
    name: "PDF to text",
    description: "Extract real selectable text in reading order, with page separators.",
    category: "convert",
    icon: "text",
    accept: "pdf",
    multiple: false,
    cta: "Extract text",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Extract the document’s selectable text into a UTF-8 file.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Scanned pages have no selectable text. Use OCR rather than expecting text extraction to invent missing words.",
    faqs: [
      {
        q: "Is PDF to text free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Scanned pages have no selectable text. Use OCR rather than expecting text extraction to invent missing words.",
      },
    ],
  },
  {
    slug: "text-to-pdf",
    name: "Text to PDF",
    description: "Create clean, searchable PDF pages from UTF-8 plain text.",
    category: "convert",
    icon: "type",
    accept: "text",
    multiple: false,
    cta: "Create PDF",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Choose a text size and a document title.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Supports Latin and Devanagari with bundled open fonts. Other unsupported scripts or emoji are rejected with a clear message.",
    faqs: [
      {
        q: "Is Text to PDF free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Supports Latin and Devanagari with bundled open fonts. Other unsupported scripts or emoji are rejected with a clear message.",
      },
    ],
  },
  {
    slug: "page-numbers",
    name: "Page numbers",
    description: "Add clean, customizable page numbers to your document.",
    category: "edit",
    icon: "hash",
    accept: "pdf",
    multiple: false,
    cta: "Add page numbers",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Choose placement, starting number and whether to show a total.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Numbers are added as new page content. Modifying any PDF can invalidate existing digital signatures.",
    faqs: [
      {
        q: "Is Page numbers free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Numbers are added as new page content. Modifying any PDF can invalidate existing digital signatures.",
      },
    ],
  },
  {
    slug: "watermark",
    name: "Watermark PDF",
    description: "Stamp custom text with precise opacity, color and rotation.",
    category: "edit",
    icon: "stamp",
    accept: "pdf",
    multiple: false,
    cta: "Add watermark",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Enter watermark text and customize its appearance.",
      "Process locally, review the result, and download your output.",
    ],
    limitation: "This adds an overlay; it is not tamper-proof rights management or redaction.",
    faqs: [
      {
        q: "Is Watermark PDF free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "This adds an overlay; it is not tamper-proof rights management or redaction.",
      },
    ],
  },
  {
    slug: "sign",
    name: "Sign PDF",
    description: "Draw or type an electronic signature and place it on a page.",
    category: "edit",
    icon: "pen",
    accept: "pdf",
    multiple: false,
    cta: "Add signature",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Draw your signature or type your name, then choose its page and position.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "This is an image-based electronic signature, not certificate-backed digital signing or identity verification.",
    faqs: [
      {
        q: "Is Sign PDF free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "This is an image-based electronic signature, not certificate-backed digital signing or identity verification.",
      },
    ],
  },
  {
    slug: "protect",
    name: "Protect PDF",
    description: "Encrypt your PDF with real AES-256 password protection.",
    category: "security",
    icon: "lock",
    accept: "pdf",
    multiple: false,
    cta: "Encrypt PDF",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Choose a strong opening password and confirm it.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Use at least 8 characters. Save your password safely: there is no recovery backdoor. Encryption does not prevent an authorized reader from sharing an unlocked copy.",
    faqs: [
      {
        q: "Is Protect PDF free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Use at least 8 characters. Save your password safely: there is no recovery backdoor. Encryption does not prevent an authorized reader from sharing an unlocked copy.",
      },
    ],
  },
  {
    slug: "unlock",
    name: "Unlock PDF",
    description: "Remove PDF encryption using a password you already know.",
    category: "security",
    icon: "unlock",
    accept: "pdf",
    multiple: false,
    cta: "Unlock PDF",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Enter the document’s known open or owner password.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Only process documents you own or have permission to modify. This tool does not crack unknown passwords.",
    faqs: [
      {
        q: "Is Unlock PDF free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Only process documents you own or have permission to modify. This tool does not crack unknown passwords.",
      },
    ],
  },
  {
    slug: "crop",
    name: "Crop PDF",
    description: "Trim visible page margins with precise point measurements.",
    category: "edit",
    icon: "crop",
    accept: "pdf",
    multiple: false,
    cta: "Crop PDF",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Set the top, bottom, left and right margins to hide.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Cropping hides content outside the crop box; it does not erase it. Do not use cropping to remove sensitive information.",
    faqs: [
      {
        q: "Is Crop PDF free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Cropping hides content outside the crop box; it does not erase it. Do not use cropping to remove sensitive information.",
      },
    ],
  },
  {
    slug: "resize",
    name: "Resize PDF pages",
    description: "Fit document pages to A4, Letter, Legal or A3 paper.",
    category: "organize",
    icon: "expand",
    accept: "pdf",
    multiple: false,
    cta: "Resize pages",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Choose a target paper size and orientation.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Visible page content is scaled to fit. Interactive elements and digital signatures may not survive; retain the original.",
    faqs: [
      {
        q: "Is Resize PDF pages free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Visible page content is scaled to fit. Interactive elements and digital signatures may not survive; retain the original.",
      },
    ],
  },
  {
    slug: "flatten",
    name: "Flatten PDF forms",
    description: "Make filled form fields part of the static PDF page.",
    category: "optimize",
    icon: "layers",
    accept: "pdf",
    multiple: false,
    cta: "Flatten forms",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Save filled AcroForm fields as permanent page content.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Flattens standard AcroForm fields, not arbitrary layers or XFA forms. Keep a copy if you may need to edit the fields again.",
    faqs: [
      {
        q: "Is Flatten PDF forms free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Flattens standard AcroForm fields, not arbitrary layers or XFA forms. Keep a copy if you may need to edit the fields again.",
      },
    ],
  },
  {
    slug: "redact",
    name: "Redact PDF permanently",
    description: "Remove selected sensitive regions by rebuilding sanitized page images.",
    category: "security",
    icon: "shield",
    accept: "pdf",
    multiple: false,
    cta: "Apply permanent redaction",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Draw black-out regions on the preview, or add a box with coordinates.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "All pages are rasterized into a fresh PDF without original text, attachments, links, forms or metadata. A Markdown log records every burned region. Selection must fully cover the information. Review the result before sharing.",
    faqs: [
      {
        q: "Is Redact PDF permanently free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "All pages are rasterized into a fresh PDF without original text, attachments, links, forms or metadata. Selection must fully cover the information. Review the result before sharing.",
      },
    ],
  },
  {
    slug: "ocr",
    name: "OCR PDF & images",
    description: "Recognize English or Hindi text locally, without uploading scans.",
    category: "convert",
    icon: "scan",
    accept: "pdf-image",
    multiple: false,
    cta: "Recognize text",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Choose English, Hindi or both; then run local text recognition.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "OCR is probabilistic and can misread names, figures and poor scans. Review all output. Large documents take time and use device memory.",
    faqs: [
      {
        q: "Is OCR PDF & images free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "OCR is probabilistic and can misread names, figures and poor scans. Review all output. Large documents take time and use device memory.",
      },
    ],
  },
  {
    slug: "metadata",
    name: "Edit PDF metadata",
    description: "Inspect, update or clear title, author, subject and keywords.",
    category: "edit",
    icon: "info",
    accept: "pdf",
    multiple: false,
    cta: "Save metadata",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Enter replacement metadata, or choose to clear standard metadata.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Standard document info and XMP can be cleared. This does not remove content, annotations or attachments; use Sanitize for a visual-only copy.",
    faqs: [
      {
        q: "Is Edit PDF metadata free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Standard document info and XMP can be cleared. This does not remove content, annotations or attachments; use Sanitize for a visual-only copy.",
      },
    ],
  },
  {
    slug: "sanitize",
    name: "Sanitize PDF",
    description:
      "Create a visual-only copy without hidden text, attachments or interactive objects.",
    category: "security",
    icon: "shield-check",
    accept: "pdf",
    multiple: false,
    cta: "Create sanitized copy",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Choose render resolution and rebuild the document from page images.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Rasterization removes selectable text, forms, links, attachments and existing signatures. Visible content remains; use Redact to cover sensitive visible regions too.",
    faqs: [
      {
        q: "Is Sanitize PDF free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Rasterization removes selectable text, forms, links, attachments and existing signatures. Visible content remains; use Redact to cover sensitive visible regions too.",
      },
    ],
  },
  {
    slug: "compare",
    name: "Compare PDFs",
    description: "Compare rendered pages and download actual visual difference maps.",
    category: "organize",
    icon: "columns",
    accept: "pdf",
    multiple: true,
    cta: "Compare PDFs",
    steps: [
      "Choose your files. Nothing is uploaded.",
      "Add exactly two PDFs to compare corresponding pages.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Pixel-based visual comparison, not legal or semantic document analysis. Rendering and antialiasing differences can create false positives.",
    faqs: [
      {
        q: "Is Compare PDFs free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Pixel-based visual comparison, not legal or semantic document analysis. Rendering and antialiasing differences can create false positives.",
      },
    ],
  },
  {
    slug: "extract-images",
    name: "Extract PDF images",
    description: "Recover supported embedded raster images at native pixel dimensions.",
    category: "convert",
    icon: "images",
    accept: "pdf",
    multiple: false,
    cta: "Extract images",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Extract supported embedded images from the selected PDF.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Extracts supported raster image objects, not vector graphics or complete page layouts. Duplicated images are deduplicated. Unsupported image objects are reported.",
    faqs: [
      {
        q: "Is Extract PDF images free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Extracts supported raster image objects, not vector graphics or complete page layouts. Duplicated images are deduplicated. Unsupported image objects are reported.",
      },
    ],
  },
  {
    slug: "pdf-to-csv",
    name: "PDF to CSV",
    description: "Export selectable text rows into a UTF-8 CSV for spreadsheets.",
    category: "convert",
    icon: "table",
    accept: "pdf",
    multiple: false,
    cta: "Export CSV",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Export positional text rows and review the inferred columns.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Best for simple text tables. This is heuristic text-row extraction, not full spreadsheet or financial-table reconstruction. Review the CSV before using it.",
    faqs: [
      {
        q: "Is PDF to CSV free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Best for simple text tables. This is heuristic text-row extraction, not full spreadsheet or financial-table reconstruction. Review the CSV before using it.",
      },
    ],
  },
  {
    slug: "pdf-to-markdown",
    name: "PDF to Markdown",
    description: "Turn selectable PDF text into clean Markdown with headings and tables.",
    category: "convert",
    icon: "file-code",
    accept: "pdf",
    multiple: false,
    cta: "Convert to Markdown",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Convert detected headings, lists and simple tables into Markdown.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Markdown captures text structure, not exact appearance. Multi-column layouts, charts and images are simplified. Run OCR first for scanned pages.",
    faqs: [
      {
        q: "Is PDF to Markdown free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames or passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Markdown captures text structure, not exact appearance. Multi-column layouts, charts and images are simplified. Run OCR first for scanned pages.",
      },
    ],
  },
  {
    slug: "pdf-to-excel",
    name: "PDF to Excel",
    description: "Rebuild selectable PDF text grids as a genuine editable XLSX workbook.",
    category: "convert",
    icon: "sheet",
    accept: "pdf",
    multiple: false,
    cta: "Convert to Excel",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Rebuild positional text grids into one workbook sheet per PDF page.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Best for simple text tables. This is positional grid reconstruction, not verified spreadsheet or financial-table recovery. Review every number; run OCR first for scans.",
    faqs: [
      {
        q: "Is PDF to Excel free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames or passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Best for simple text tables. This is positional grid reconstruction, not verified spreadsheet or financial-table recovery. Review every number; run OCR first for scans.",
      },
    ],
  },
  {
    slug: "excel-to-pdf",
    name: "Excel to PDF",
    description: "Render an XLSX workbook locally into clean, searchable PDF tables.",
    category: "convert",
    icon: "file-sheet",
    accept: "spreadsheet",
    multiple: false,
    cta: "Convert to PDF",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Render each worksheet as a searchable table with simplified styling.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "XLSX only, not legacy XLS. Merged cells, charts, images and custom number formats are simplified; dates use stored values. Macro-enabled files are rejected.",
    faqs: [
      {
        q: "Is Excel to PDF free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames or passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "XLSX only, not legacy XLS. Merged cells, charts, images and custom number formats are simplified; dates use stored values. Macro-enabled files are rejected.",
      },
    ],
  },
  {
    slug: "pdf-to-powerpoint",
    name: "PDF to PowerPoint",
    description: "Turn each PDF page into an editable slide with text, tables and images.",
    category: "convert",
    icon: "slides",
    accept: "pdf",
    multiple: false,
    cta: "Convert to PowerPoint",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Rebuild one editable slide per page with detected headings, tables and images.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "One slide per page, up to 500 pages. Text, simple tables and embedded images are rebuilt as editable shapes; charts, precise layout and original fonts are simplified. Run OCR first for scans.",
    faqs: [
      {
        q: "Is PDF to PowerPoint free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames or passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "One slide per page, up to 500 pages. Text, simple tables and embedded images are rebuilt as editable shapes; charts, precise layout and original fonts are simplified. Run OCR first for scans.",
      },
    ],
  },
  {
    slug: "powerpoint-to-pdf",
    name: "PowerPoint to PDF",
    description: "Convert a PPTX locally into a searchable text-first PDF.",
    category: "convert",
    icon: "slides",
    accept: "presentation",
    multiple: false,
    cta: "Convert to PDF",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Convert slide titles, bullets, tables and images into searchable PDF pages.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "PPTX only, not legacy PPT. Text, tables and embedded PNG/JPEG images convert to searchable pages; animations, transitions, notes, charts and SmartArt are not reproduced. Macro-enabled files are rejected.",
    faqs: [
      {
        q: "Is PowerPoint to PDF free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames or passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "PPTX only, not legacy PPT. Text, tables and embedded PNG/JPEG images convert to searchable pages; animations, transitions, notes, charts and SmartArt are not reproduced. Macro-enabled files are rejected.",
      },
    ],
  },
  {
    slug: "fill-pdf-form",
    name: "Fill PDF form",
    description: "Type values into a PDF’s fillable form fields, entirely on your device.",
    category: "edit",
    icon: "form",
    accept: "pdf",
    multiple: false,
    cta: "Save filled form",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Enter a value for each detected text, checkbox or choice field.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Standard AcroForm fields only; XFA forms are not supported. Fields stay editable after filling; use Flatten to make them static.",
    faqs: [
      {
        q: "Is Fill PDF form free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames or passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Standard AcroForm fields only; XFA forms are not supported. Fields stay editable after filling; use Flatten to make them static.",
      },
    ],
  },
  {
    slug: "summarize",
    name: "Summarize PDF",
    description: "Pick a PDF’s key sentences locally with honest extractive summarization.",
    category: "convert",
    icon: "summary",
    accept: "pdf",
    multiple: false,
    cta: "Summarize PDF",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Choose a summary length; key sentences are selected on your device.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "Extractive summarization selects existing sentences by word frequency; it does not understand, verify or rewrite content. Run OCR first for scanned pages.",
    faqs: [
      {
        q: "Is Summarize PDF free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser’s memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames or passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app’s references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "Extractive summarization selects existing sentences by word frequency; it does not understand, verify or rewrite content. Run OCR first for scanned pages.",
      },
    ],
  },
  {
    slug: "inspect",
    name: "Inspect PDF",
    description:
      "Read a PDF's facts on your device: scanned pages, language, topics and next steps.",
    category: "organize",
    icon: "inspect",
    accept: "pdf",
    multiple: false,
    cta: "Inspect PDF",
    steps: [
      "Choose your file. Nothing is uploaded.",
      "Facts are measured on your device: no settings needed.",
      "Process locally, review the result, and download your output.",
    ],
    limitation:
      "On-device analysis only: word-frequency language and topic guesses, pattern counts and PDF metadata. It does not understand, verify or rewrite content. Scanned pages need OCR first for text-based facts.",
    faqs: [
      {
        q: "Is Inspect PDF free to use?",
        a: "Yes. There are no subscriptions, sign-ups, daily-use quotas or premium tools. Your browser's memory and the published file-safety limits still apply.",
      },
      {
        q: "Are my files uploaded to a server?",
        a: "The processing engine runs in your browser. Document contents, filenames and passwords are not sent to a processing server. Refreshing or clearing the workspace removes the app's references to your files.",
      },
      {
        q: "What are the important limitations?",
        a: "On-device analysis only: word-frequency language and topic guesses, pattern counts and PDF metadata. It does not understand, verify or rewrite content. Scanned pages need OCR first for text-based facts.",
      },
    ],
  },
];
export function getTool(slug: string) {
  return TOOLS.find((t) => t.slug === slug);
}
