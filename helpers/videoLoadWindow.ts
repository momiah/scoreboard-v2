export const VIDEO_LOAD_RADIUS = 1;

export const isInVideoLoadWindow = (index: number, activeIndex: number) =>
  activeIndex >= 0 && Math.abs(index - activeIndex) <= VIDEO_LOAD_RADIUS;
