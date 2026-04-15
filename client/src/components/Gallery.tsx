import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const galleryImages = [
  {
    src: "/images/gallery-1.jpg",
    alt: "Dog enjoying our specialised agility equipment and trampolines in the outdoor play area",
    title: "Agility & Fun Equipment"
  },
  {
    src: "/images/gallery-2.jpg",
    alt: "Happy dogs in our secure outdoor exercise area with enrichment activities",
    title: "Outdoor Exercise Yard"
  },
  {
    src: "/images/gallery-3.jpg",
    alt: "Dogs socializing and playing together in our supervised group activities",
    title: "Supervised Playtime"
  }
];

export default function Gallery() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const galleryRef = useScrollAnimation();

  const goToNext = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % galleryImages.length);
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  }, []);

  // Auto-play: always on, pauses on hover/interaction
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(goToNext, 5000);
    return () => clearInterval(interval);
  }, [isPaused, goToNext]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <section ref={galleryRef} className="section-spacing bg-white dark:bg-gray-900 scroll-animate-out">
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
        <div
          className="relative max-w-5xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          <div className="relative overflow-hidden rounded-2xl shadow-2xl h-64 sm:h-80 md:h-96 lg:h-[500px]">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  {/* Title Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 text-white">
                    <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold">{image.title}</h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Arrows - larger touch targets with blur backdrop */}
            <button
              onClick={goToPrevious}
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 active:bg-black/50 backdrop-blur-md text-white rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center transition-all duration-300 group"
              data-testid="button-carousel-previous"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 group-hover:-translate-x-0.5" />
            </button>

            <button
              onClick={goToNext}
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 active:bg-black/50 backdrop-blur-md text-white rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center transition-all duration-300 group"
              data-testid="button-carousel-next"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Pill-shaped indicators */}
          <div className="flex justify-center gap-2 mt-5 sm:mt-7">
            {galleryImages.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 min-h-[20px] flex items-center ${
                  index === currentSlide
                    ? 'w-8 sm:w-10 bg-[var(--hi-gold)]'
                    : 'w-2 sm:w-2.5 bg-gray-300 dark:bg-gray-600 hover:bg-[var(--hi-gold)]/50'
                }`}
                data-testid={`carousel-indicator-${index}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}