export type YTPlayerInstance = {
  destroy: () => void;
  getDuration: () => number;
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getPlayerState: () => number;
  pauseVideo: () => void;
  playVideo: () => void;
  setVolume: (v: number) => void;
  mute: () => void;
  unMute: () => void;
  getOption: (module: string, option: string) => unknown;
  loadModule: (module: string) => void;
  setOption: (module: string, option: string, value: unknown) => void;
};

export type YTPlayerEvent = {
  target: YTPlayerInstance;
};

export type YTPlayerStateEvent = {
  data: number;
  target: YTPlayerInstance;
};

export type YTPlayerOptions = {
  videoId: string;
  width?: string;
  height?: string;
  playerVars?: Record<string, unknown>;
  events?: {
    onReady?: (event: YTPlayerEvent) => void;
    onStateChange?: (event: YTPlayerStateEvent) => void;
  };
};

export type YTNamespace = {
  Player: new (elementId: string, options: YTPlayerOptions) => YTPlayerInstance;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady: () => void;
  }
}
