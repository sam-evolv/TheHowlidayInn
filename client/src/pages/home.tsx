import HeroPremium from "@/components/HeroPremium";
import ThingsToKnow from "@/components/ThingsToKnow";
import Gallery from "@/components/Gallery";
import FAQ from "@/components/FAQ";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { CheckCircle2, Heart, Shield, Sun, Home as HomeIcon, Zap } from "lucide-react";
import { FeatureIcon } from "@/components/FeatureIcon";

export default function Home() {
  const [, setLocation] = useLocation();
  const aboutRef = useScrollAnimation();
  const servicesRef = useScrollAnimation();
  const ctaRef = useScrollAnimation();

  return (
    <div className="min-h-screen page-enter">
      {/* Premium Hero Section with Video */}
      <HeroPremium />

      {/* About Section */}
      <section ref={aboutRef} className="py-16 sm:py-20 md:py-28 scroll-animate-out" style={{ background: 'var(--hi-cream)' }}>
        <div className="container mx-auto px-6 sm:px-8 lg:px-12">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 sm:mb-8" style={{ color: 'var(--hi-brown)' }}>
              About The Howliday Inn
            </h2>
            <p className="text-lg sm:text-xl mb-8 sm:mb-12 leading-relaxed" style={{ color: 'var(--hi-brown)' }}>
              The Howliday Inn is Ireland's premier destination for dog daycare and boarding. 
              Our state-of-the-art facility in the heart of Cork combines luxury accommodations with expert care, 
              ensuring every dog feels safe, happy, and loved while you're away.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 mt-12 sm:mt-16">
              <div className="text-center p-6 rounded-lg transition shadow-sm hover:shadow-md hover:-translate-y-[2px]">
                <div className="flex justify-center mb-4">
                  <FeatureIcon icon={CheckCircle2} variant="coin" />
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--hi-brown)' }}>Licensed & Insured</h3>
                <p className="text-neutral-600">Fully licensed facility with comprehensive insurance coverage for complete peace of mind.</p>
              </div>
              <div className="text-center p-6 rounded-lg transition shadow-sm hover:shadow-md hover:-translate-y-[2px]">
                <div className="flex justify-center mb-4">
                  <FeatureIcon icon={Heart} variant="coin" />
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--hi-brown)' }}>Expert Care</h3>
                <p className="text-neutral-600">Experienced staff trained in first aid and specialised care techniques.</p>
              </div>
              <div className="text-center p-6 rounded-lg transition shadow-sm hover:shadow-md hover:-translate-y-[2px]">
                <div className="flex justify-center mb-4">
                  <FeatureIcon icon={Shield} variant="coin" />
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--hi-brown)' }}>Safe & Secure</h3>
                <p className="text-neutral-600">Carefully designed spaces prioritising safety and comfort for every guest.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section ref={servicesRef} className="py-16 sm:py-20 md:py-28 bg-hi-cream dark:bg-hi-charcoal scroll-animate-out">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 sm:mb-8" style={{ color: 'var(--hi-brown)' }}>
              Our Premium Services
            </h2>
            <p className="text-lg sm:text-xl max-w-2xl mx-auto px-4" style={{ color: 'var(--hi-brown)' }}>
              Choose the perfect care option for your dog's needs, with set windows for drop-off and collection
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 max-w-6xl mx-auto">
            <div className="card card-hover rounded-lg p-6 sm:p-8 transition shadow-sm hover:shadow-md hover:-translate-y-[2px]" style={{ background: '#FFFFFF', border: '1px solid var(--hi-border)' }}>
              <div className="flex justify-center mb-4">
                <FeatureIcon icon={Sun} variant="coin" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2" style={{ color: 'var(--hi-brown)' }}>Daycare</h3>
              <p className="mb-4" style={{ color: 'var(--hi-brown)' }}>
                Full-day supervised care with structured play, socialisation, and exercise. Perfect for working days when your dog needs stimulation and companionship.
              </p>
              <ul className="text-sm mb-6 space-y-1" style={{ color: 'var(--hi-brown)' }}>
                <li>• Supervised group play sessions</li>
                <li>• Individual attention and care</li>
                <li>• Drop off 8am-10am, Collection 4pm-6pm</li>
              </ul>
              <Button 
                className="btn-primary btn-premium focus-premium min-h-[44px]"
                onClick={() => setLocation("/daycare")}
                data-testid="button-daycare-service"
              >
                Book Daycare
              </Button>
            </div>

            <div className="card card-hover rounded-lg p-6 sm:p-8 transition shadow-sm hover:shadow-md hover:-translate-y-[2px]" style={{ background: '#FFFFFF', border: '1px solid var(--hi-border)' }}>
              <div className="flex justify-center mb-4">
                <FeatureIcon icon={HomeIcon} variant="coin" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2" style={{ color: 'var(--hi-brown)' }}>Boarding</h3>
              <p className="mb-4" style={{ color: 'var(--hi-brown)' }}>
                Overnight stays in comfortable, private suites with 24/7 care. Your dog will receive individual attention and maintain their routine while you're away.
              </p>
              <ul className="text-sm mb-6 space-y-1" style={{ color: 'var(--hi-brown)' }}>
                <li>• Private boarding suites</li>
                <li>• 24/7 professional supervision</li>
                <li>• Regular exercise and playtime</li>
                <li>• Customised feeding schedules</li>
                <li>• Bring food & beds - we provide bowls and blankets</li>
                <li>• Photos and updates will be sent when possible</li>
              </ul>
              <Button 
                className="btn-primary btn-premium focus-premium min-h-[44px]"
                onClick={() => setLocation("/boarding")}
                data-testid="button-boarding-service"
              >
                Book Boarding
              </Button>
            </div>

            <div className="rounded-lg p-6 sm:p-8 md:col-span-2 lg:col-span-1 transition shadow-sm hover:shadow-md hover:-translate-y-[2px]" style={{ background: '#FFFFFF', border: '1px solid var(--hi-border)' }}>
              <div className="flex justify-center mb-4">
                <FeatureIcon icon={Zap} variant="coin" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2" style={{ color: 'var(--hi-brown)' }}>Trial Day</h3>
              <p className="mb-4" style={{ color: 'var(--hi-brown)' }}>
                Perfect for first-time guests! Let your dog experience our facility and meet our staff in a low-pressure environment before committing to longer stays.
              </p>
              <ul className="text-sm mb-6 space-y-1" style={{ color: 'var(--hi-brown)' }}>
                <li>• Full day introduction to our facility</li>
                <li>• Assessment of your dog's temperament</li>
              </ul>
              <Button 
                className="btn-primary btn-premium focus-premium min-h-[44px]"
                onClick={() => setLocation("/trial")}
                data-testid="button-trial-service"
              >
                Book Trial Day
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Things to Know Section */}
      <ThingsToKnow />

      {/* Gallery Section */}
      <Gallery />

      {/* FAQ Section */}
      <FAQ />

      {/* Call to Action */}
      <section ref={ctaRef} className="py-16 sm:py-20 md:py-28 scroll-animate-out" style={{ background: 'var(--hi-charcoal)' }}>
        <div className="container mx-auto px-6 sm:px-8 lg:px-12 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 sm:mb-8" style={{ color: 'var(--hi-cream)' }}>
            Ready to Give Your Dog the Best Care?
          </h2>
          <p className="text-lg sm:text-xl mb-8 sm:mb-12 max-w-2xl mx-auto px-4" style={{ color: 'var(--hi-cream)' }}>
            Join hundreds of happy dog families who trust The Howliday Inn for premium daycare and boarding services.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Button
              size="lg"
              className="btn-ghost-orange btn-premium focus-premium inline-flex items-center rounded-md px-6 sm:px-8 py-3 sm:py-4 font-semibold transition min-h-[48px]"
              onClick={() => setLocation('/daycare')}
              data-testid="button-cta-book"
            >
              Book Your First Visit
            </Button>
            <Button
              size="lg"
              className="btn-ghost-orange btn-premium focus-premium inline-flex items-center rounded-md px-6 sm:px-8 py-3 sm:py-4 font-semibold transition min-h-[48px]"
              onClick={() => setLocation('/about')}
              data-testid="button-cta-learn-more"
            >
              Learn More About Us
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}