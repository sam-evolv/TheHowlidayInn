import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Shield, Heart, FileCheck } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { HOURS_COPY } from "@/config/hours";

const thingsToKnowData = [
  {
    icon: Clock,
    title: HOURS_COPY.title,
    description: HOURS_COPY.subtitle,
    details: HOURS_COPY.bullets
  },
  {
    icon: Shield,
    title: "Vaccination Requirements",
    description: "Keeping all our guests safe and healthy",
    details: [
      "All vaccinations including Kennel Cough must be up to date in order to attend this facility",
      "If your dog does not have the kennel cough vaccination you will need to get this done and wait two weeks before we will accept a booking"
    ]
  },
  {
    icon: Heart,
    title: "What to Bring",
    description: "Making your dog feel at home",
    details: [
      "Your dog's favorite food (we'll supplement as needed)",
      "Any medications with clear instructions",
      "A comfort item like a blanket or toy",
      "Emergency contact information"
    ]
  },
  {
    icon: FileCheck,
    title: "Booking Policy",
    description: "Simple and transparent guidelines",
    details: [
      "Trial day required for first-time guests",
      "Breed restrictions apply for safety",
      "Full refund with 48 hours cancellation notice",
      "During peak season (May-September) 72 hours notice is required"
    ]
  }
];

export default function ThingsToKnow() {
  const thingsRef = useScrollAnimation();
  
  return (
    <section ref={thingsRef} id="things-to-know" className="py-16 sm:py-20 md:py-28 bg-hi-cream dark:bg-hi-charcoal scroll-animate-out">
      <div className="container mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-center mb-14 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'var(--hi-brown)' }}>
            Things to Know
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--hi-brown)' }}>
            Everything you need to know to ensure your dog has the best possible experience at The Howliday Inn
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {thingsToKnowData.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <Card key={index} className="thing-card rounded-xl border border-black/5 transition will-change-transform shadow-sm hover:shadow-2xl hover:-translate-y-0.5" style={{ background: 'var(--hi-cream)' }}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg" style={{ background: 'var(--hi-beige)' }}>
                      <IconComponent className="w-6 h-6" style={{ color: 'var(--hi-brown)' }} />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold" style={{ color: 'var(--hi-brown)' }}>
                        {item.title}
                      </CardTitle>
                      <CardDescription className="mt-1" style={{ color: 'var(--hi-brown)' }}>
                        {item.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {item.details.map((detail, detailIndex) => (
                      <li key={detailIndex} className="flex items-start gap-2">
                        <div 
                          className="w-2 h-2 rounded-full mt-2 flex-shrink-0" 
                          style={{ background: 'var(--hi-gold)' }}
                        ></div>
                        <span style={{ color: 'var(--hi-brown)' }}>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <p className="mb-4" style={{ color: 'var(--hi-brown)' }}>
            Have questions? We're here to help!
          </p>
          <div className="contact-links flex items-center justify-center flex-wrap gap-2">
            <a 
              href="tel:+353873345702"
              className="inline-flex items-center gap-2 font-semibold transition-colors"
              data-testid="link-contact-phone"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              Call us at (087) 334-5702
            </a>
            <span>or</span>
            <a 
              href="mailto:howlidayinn1@gmail.com"
              className="inline-flex items-center gap-2 font-semibold transition-colors"
              data-testid="link-contact-email"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              Email howlidayinn1@gmail.com
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}