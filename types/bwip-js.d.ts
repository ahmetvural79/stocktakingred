declare module 'bwip-js' {
  interface BwipJs {
    toCanvas(canvas: HTMLCanvasElement, options: Record<string, unknown>): Promise<void>
  }

  const bwipjs: BwipJs
  export default bwipjs
}

