declare module "mammoth/mammoth.browser.min.js" {
  const mammoth: {
    convertToHtml: (input: {
      arrayBuffer: ArrayBuffer;
    }) => Promise<{ value: string; messages: unknown[] }>;
  };
  export default mammoth;
  export function convertToHtml(input: {
    arrayBuffer: ArrayBuffer;
  }): Promise<{ value: string; messages: unknown[] }>;
}
