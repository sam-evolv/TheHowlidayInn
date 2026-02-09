import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo';

const galleryImages = [
  {
    src: `https://res.cloudinary.com/${cloudName}/image/upload/w_800,q_auto,f_auto/v1/howliday-inn/gallery-1`,
    alt: "Dog enjoying our specialised agility equipment and trampolines in the outdoor play area",
    title: "Agility & Fun Equipment"
  },
  {
    src: `https://res.cloudinary.com/${cloudName}/image/upload/w_800,q_auto,f_auto/v1/howliday-inn/gallery-2`,
    alt: "Happy dogs in our secure outdoor exercise area with enrichment activities",
    title: "Outdoor Exercise Yard"
  },
  {
    src: `https://res.cloudinary.com/${cloudName}/image/upload/w_800,q_auto,f_auto/v1/howliday-inn/gallery-3`,
    alt: "Dogs socializing and playing together in our supervised group activities",
    title: "Supervised Playtime"
  }
];

export default function Gallery() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const galleryRef = useScrollAnimation();

  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % galleryImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
    setIsAutoPlaying(false);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % galleryImages.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  return (
    <section ref={galleryRef} className="py-16 sm:py-20 md:py-28 bg-white dark:bg-gray-900 scroll-animate-out">
      <div className="container mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-center mb-10 sm:mb-14 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
            See Happy Dogs in Action
          </h2>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-4">
            Watch how our furry friends enjoy their time at The Howliday Inn
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative max-w-5xl mx-auto">
          <div className="relative overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl shadow-2xl h-64 sm:h-80 md:h-96 lg:h-[500px]">
            {/* Slides */}
            <div className="relative h-full">
              {galleryImages.map((image, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                    index === currentSlide
                      ? 'opacity-100 translate-x-0'
                      : index < currentSlide
                      ? 'opacity-0 -translate-x-full'
                      : 'opacity-0 translate-x-full'
                  }`}
                  data-testid={`carousel-slide-${index}`}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                    style={index === 0 ? { objectPosition: 'center 20%' } : undefined}
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                  {/* Title Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 text-white">
                    <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold">{image.title}</h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={goToPrevious}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-sm text-white rounded-full p-2 sm:p-3 transition-all duration-300 hover:scale-110 min-h-[44px] min-w-[44px] flex items-center justify-center"
              data-testid="button-carousel-previous"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <button
              onClick={goToNext}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-sm text-white rounded-full p-2 sm:p-3 transition-all duration-300 hover:scale-110 min-h-[44px] min-w-[44px] flex items-center justify-center"
              data-testid="button-carousel-next"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Indicators */}
          <div className="flex justify-center gap-2 mt-4 sm:mt-6">
            {galleryImages.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`transition-all duration-300 rounded-full min-h-[24px] ${
                  index === currentSlide
                    ? 'bg-primary w-10 sm:w-12 h-2.5 sm:h-3'
                    : 'bg-gray-300 dark:bg-gray-600 w-2.5 sm:w-3 h-2.5 sm:h-3 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
                data-testid={`carousel-indicator-${index}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Auto-play indicator */}
          <div className="text-center mt-3 sm:mt-4">
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors min-h-[44px] px-4"
              data-testid="button-autoplay-toggle"
            >
              {isAutoPlaying ? '⏸ Pause' : '▶ Play'} Auto-advance
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}