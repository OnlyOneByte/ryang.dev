// TTF imported as a bundled asset URL string (Vite/Astro asset handling).
declare module '*.ttf' {
  const url: string;
  export default url;
}

// TTF imported as raw bytes (Vite ?arraybuffer) — used for OG font embedding.
declare module '*.ttf?arraybuffer' {
  const data: ArrayBuffer;
  export default data;
}
