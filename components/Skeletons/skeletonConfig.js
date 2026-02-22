export const DEFAULT_SKELETON_CONFIG = {
  colorMode: "dark",
  colors: ["rgb(5, 26, 51)", "rgb(12, 68, 133)", "rgb(5, 26, 51)"],
  transition: {
    type: "timing",
    duration: 1000,
  },
};

export const SKELETON_THEMES = {
  dark: {
    colorMode: "dark",
    colors: ["rgb(5, 26, 51)", "rgb(12, 68, 133)", "rgb(5, 26, 51)"],
  },
  light: {
    colorMode: "light",
    colors: ["#f0f0f0", "#e0e0e0", "#f0f0f0"],
  },
  subtle: {
    colorMode: "dark",
    colors: ["#2a2a2a", "#3a3a3a", "#2a2a2a"],
  },
  contrast: {
    colorMode: "dark",
    colors: ["#1a1a1a", "#4a4a4a", "#1a1a1a"],
  },
};

export const createSkeletonConfig = (overrides = {}) => {
  return {
    ...DEFAULT_SKELETON_CONFIG,
    ...overrides,
  };
};

export const skeletonConfig = {
    ...SKELETON_THEMES.dark,
    transition: {
      type: "timing",
      duration: 1500,
    },
  };

