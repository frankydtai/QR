declare global {
  interface Window {
    // QR generation functions
    generateQRCode?: (content: string, options: any) => any;
    generateQRArt?: (content: string, options: any) => any;
    
    // Go runtime constructor
    Go?: new () => {
      importObject: WebAssembly.Imports;
      run: (instance: WebAssembly.Instance) => Promise<void>;
    };
  }
}

export {};
