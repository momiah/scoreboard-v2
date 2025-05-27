import { useState } from "react";

// Custom hook for individual image loading state
export const useImageLoader = (initialLoaded = false) => {
  const [imageLoaded, setImageLoaded] = useState(initialLoaded);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = (error) => {
    console.warn("Failed to load image:", error);
    setImageError(true);
    setImageLoaded(true);
  };

  const resetLoader = () => {
    setImageLoaded(false);
    setImageError(false);
  };

  return {
    imageLoaded,
    imageError,
    handleImageLoad,
    handleImageError,
    resetLoader,
  };
};

// Custom hook for multiple image loading state (all-or-nothing approach)
export const useMultipleImageLoader = (imageCount) => {
  const [loadedCount, setLoadedCount] = useState(0);
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);
  const [errors, setErrors] = useState([]);

  const handleImageLoad = (index) => {
    setLoadedCount((prev) => {
      const newCount = prev + 1;
      if (newCount === imageCount) {
        setAllImagesLoaded(true);
      }
      return newCount;
    });
  };

  const handleImageError = (index, error) => {
    console.warn(`Failed to load image at index ${index}:`, error);
    setErrors((prev) => [...prev, { index, error }]);
    handleImageLoad(index); // Still count as "loaded" to progress
  };

  const resetLoader = () => {
    setLoadedCount(0);
    setAllImagesLoaded(false);
    setErrors([]);
  };

  return {
    loadedCount,
    allImagesLoaded,
    errors,
    handleImageLoad,
    handleImageError,
    resetLoader,
    progress: imageCount > 0 ? loadedCount / imageCount : 0,
  };
};

// Higher-order component for wrapping components with image loading
export const withImageLoader = (WrappedComponent) => {
  return React.forwardRef((props, ref) => {
    const imageLoader = useImageLoader();

    return <WrappedComponent ref={ref} {...props} {...imageLoader} />;
  });
};

// Utility function to get image loading props for styled components
export const getImageLoadingProps = (imageLoaded) => ({
  style: {
    opacity: imageLoaded ? 1 : 0,
    transition: "opacity 0.3s ease-in-out",
  },
});

// Preloading utilities (if needed for caching)
export const preloadImage = async (source) => {
  try {
    // For local images (require), we just resolve immediately
    if (typeof source === "number") {
      return Promise.resolve(true);
    }

    // For remote images, use Image.prefetch
    const { Image } = require("react-native");
    const uri = source.uri || source;
    await Image.prefetch(uri);
    return true;
  } catch (error) {
    console.warn("Failed to preload image:", source, error);
    return false;
  }
};

export const preloadImages = async (sources) => {
  const promises = sources.map((source) => preloadImage(source));
  return Promise.allSettled(promises);
};
