/* Local qpdf runtime. Each job gets a disposable Worker and WASM memory space. */
self.onmessage = async function (event) {
  try {
    importScripts(new URL('qpdf.js', self.location.href).href);
    const runtime = await self.Module({
      locateFile: () => new URL('qpdf.wasm', self.location.href).href,
      noInitialRun: true,
      print: () => {}, printErr: () => {},
    });
    runtime.FS.writeFile('/in.pdf', new Uint8Array(event.data.bytes));
    let rc = 0;
    try { rc = runtime.callMain(event.data.args); } catch (error) { rc = typeof error.status === 'number' ? error.status : 2; }
    if (rc !== 0 && rc !== 3) throw new Error('The PDF engine could not process this document. Check its password and structure.');
    const result = runtime.FS.readFile('/out.pdf').slice();
    self.postMessage({ bytes: result.buffer }, [result.buffer]);
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'The local PDF engine failed.' }); }
};
