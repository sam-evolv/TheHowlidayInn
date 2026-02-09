import React from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Reveal } from "@/components/Reveal";
import { HeroOverlayNotice } from "@/components/system/HeroOverlayNotice";

export default function HeroPremium() {
  const [, setLocation] = useLocation();

  return (
    <section 
      id="hero"
      className="relative isolate overflow-hidden min-h-[80vh] flex items-center justify-center"
      aria-label="Hero"
    >
      {/* Background media layer */}
      <div className="absolute inset-0 -z-10">
        {/* Video with no poster or loading states */}
        <video
          className="hidden motion-safe:block h-full w-full object-cover"
          style={{ objectPosition: 'center 30%' }}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label="Happy dogs playing outdoors at The Howliday Inn"
        >
          {/* Prefer mp4 for our use case */}
          <source src="/brand/hero.mp4" type="video/mp4" />
          {/* Fallback image if video unsupported */}
          Your browser does not support the video tag.
        </video>

        {/* Fallback gradient when motion is reduced or video missing */}
        <div
          className="block motion-safe:hidden h-full w-full"
          style={{ background: 'linear-gradient(135deg, #2d5016 0%, #4a7c28 40%, #6b9b37 100%)' }}
          aria-hidden="true"
        />

        {/* Keep existing gradient/overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-black/10 to-black/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center text-white px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto pt-20 sm:pt-0">
        <Reveal delay={0}>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 tracking-tight">
            Welcome to{" "}
            <span style={{ color: 'var(--hi-gold)' }}>The Howliday Inn</span>
          </h1>
        </Reveal>
        
        <Reveal delay={0.1}>
          <p className="text-xl sm:text-2xl mb-8 text-gray-200 max-w-3xl mx-auto leading-relaxed">
            Premium daycare and boarding for your beloved companions. 
            Where every dog is treated like family in our state-of-the-art facility.
          </p>
        </Reveal>

        {/* CTA Buttons */}
        <Reveal delay={0.2}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="font-semibold px-8 py-4 text-lg transition-all btn-primary btn-premium focus-premium"
              onClick={() => setLocation('/daycare')}
              data-testid="button-book-now"
            >
              Book Now
            </Button>
            
            <Button
              size="lg"
              className="font-semibold px-8 py-4 text-lg transition-all btn-primary btn-premium focus-premium"
              onClick={() => {
                document.getElementById('things-to-know')?.scrollIntoView({ 
                  behavior: 'smooth' 
                });
              }}
              data-testid="button-things-to-know"
            >
              Things to Know
            </Button>
          </div>
        </Reveal>

        {/* Trust indicators */}
        <div className="mt-12 flex flex-wrap justify-center items-center gap-8 text-gray-300 feature-icons">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18l-1.45-1.32C5.4 14.36 2 11.28 2 7.5 2 5.42 3.42 4 5.5 4c1.74 0 3.41.81 4.5 2.09C11.09 4.81 12.76 4 14.5 4 16.58 4 18 5.42 18 7.5c0 3.78-3.4 6.86-6.55 9.18L10 18z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">Licensed & Insured</span>
          </div>
          
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">Certified Staff</span>
          </div>
          
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V7l-7-5z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">Safe & Secure Facility</span>
          </div>
        </div>
      </div>

      {/* Booking Pause Overlay Notice */}
      <HeroOverlayNotice />
    </section>
  );
}