export type WemEngine = {
  duration: number;
  preroll: number;
  renderFrame: (tSeconds: number) => void;
};

export function createEngine(opts: {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  cfg: Record<string, any>;
  featuresData: Record<string, any>;
  lyricsData: Record<string, any>;
  flipY?: boolean;
  lab?: string | null;
  onStep?: ((label: string) => void) | null;
  baseUrl?: string;
}): Promise<WemEngine>;
