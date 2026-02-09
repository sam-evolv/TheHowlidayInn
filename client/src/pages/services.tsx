import { Sun, Moon, Star, Clock, Heart, Shield, UserCheck, Camera, Award, Activity } from "lucide-react";
import { Link } from "wouter";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { FeatureIcon } from "@/components/FeatureIcon";

export default function Services() {
  const servicesGridRef = useScrollAnimation();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/20 page-enter">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-success/5"></div>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-5xl lg:text-7xl font-bold mb-6 animate-fade-in">
            Our Services
          </h1>
          <p className="text-xl lg:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed animate-fade-in stagger-delay-1">
            Comprehensive care solutions designed with your pet's wellbeing and your peace of mind at heart.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section ref={servicesGridRef} className="max-w-7xl mx-auto px-6 lg:px-8 py-16 scroll-animate-out">
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {/* Daycare */}
          <Link href="/daycare" className="block">
            <div className="card-premium card-daycare p-8 group animate-fade-in stagger-delay-1 cursor-pointer transition shadow-sm hover:shadow-md hover:-translate-y-[2px]">
              <div className="flex justify-center mb-4">
                <FeatureIcon icon={Sun} variant="coin" />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-center text-gray-900 dark:text-white">Daycare Services</h3>
            <p className="text-muted-foreground mb-6 text-center">
              Professional daytime care with structured activities, socialisation, and supervision.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm leading-relaxed">
                <Clock className="text-[#1B5E4A] h-5 w-5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                <span className="text-neutral-800">Drop off 8am-10am, Collection 4pm-6pm</span>
              </li>
              <li className="flex items-start gap-3 text-sm leading-relaxed">
                <Shield className="text-[#1B5E4A] h-5 w-5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                <span className="text-neutral-800">Trained professional supervision</span>
              </li>
              <li className="flex items-start gap-3 text-sm leading-relaxed">
                <Camera className="text-[#1B5E4A] h-5 w-5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                <span className="text-neutral-800">Photo updates sent when possible</span>
              </li>
              <li className="flex items-start gap-3 text-sm leading-relaxed">
                <Heart className="text-[#1B5E4A] h-5 w-5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                <span className="text-neutral-800">Small group socialisation activities</span>
              </li>
            </ul>
            </div>
          </Link>

          {/* Boarding */}
          <Link href="/boarding" className="block">
            <div className="card-premium card-boarding p-8 group animate-fade-in stagger-delay-2 cursor-pointer transition shadow-sm hover:shadow-md hover:-translate-y-[2px]">
              <div className="flex justify-center mb-4">
                <FeatureIcon icon={Moon} variant="coin" />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-center text-gray-900 dark:text-white">Boarding Services</h3>
            <p className="text-muted-foreground mb-6 text-center">
              Luxury overnight accommodations with round-the-clock care and comfort.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm leading-relaxed">
                <Shield className="text-[#1B5E4A] h-5 w-5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                <span className="text-neutral-800">24/7 professional supervision</span>
              </li>
              <li className="flex items-start gap-3 text-sm leading-relaxed">
                <Heart className="text-[#1B5E4A] h-5 w-5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                <span className="text-neutral-800">Private luxury suites</span>
              </li>
              <li className="flex items-start gap-3 text-sm leading-relaxed">
                <UserCheck className="text-[#1B5E4A] h-5 w-5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                <span className="text-neutral-800">Personalised care routines</span>
              </li>
              <li className="flex items-start gap-3 text-sm leading-relaxed">
                <Camera className="text-[#1B5E4A] h-5 w-5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                <span className="text-neutral-800">Photos and updates sent when possible</span>
              </li>
            </ul>
            </div>
          </Link>

          {/* Trial Days */}
          <Link href="/trial" className="block">
            <div className="card-premium card-trial p-8 group animate-fade-in stagger-delay-3 cursor-pointer transition shadow-sm hover:shadow-md hover:-translate-y-[2px]">
              <div className="flex justify-center mb-4">
                <FeatureIcon icon={Star} variant="coin" />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-center text-gray-900 dark:text-white">Trial Day Service</h3>
              <p className="text-muted-foreground mb-6 text-center">
                Mandatory assessment day for all new customers. €20 investment to ensure your dog's safety and comfort.
              </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm leading-relaxed">
                <Star className="text-[#1B5E4A] h-5 w-5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                <span className="text-neutral-800">€20 trial day assessment</span>
              </li>
              <li className="flex items-start gap-3 text-sm leading-relaxed">
                <Heart className="text-[#1B5E4A] h-5 w-5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                <span className="text-neutral-800">Personal meet & greet session</span>
              </li>
              <li className="flex items-start gap-3 text-sm leading-relaxed">
                <UserCheck className="text-[#1B5E4A] h-5 w-5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                <span className="text-neutral-800">Comprehensive behaviour evaluation</span>
              </li>
            </ul>
            </div>
          </Link>
        </div>

        {/* Additional Services */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-8">Additional Services</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="card-premium p-6 text-center transition shadow-sm hover:shadow-md hover:-translate-y-[2px]">
              <div className="flex justify-center mb-4">
                <FeatureIcon icon={Activity} variant="coin" />
              </div>
              <h4 className="font-semibold mb-2">Health Monitoring</h4>
              <p className="text-sm text-neutral-600">Health checks and medication</p>
            </div>
            <div className="card-premium p-6 text-center transition shadow-sm hover:shadow-md hover:-translate-y-[2px]">
              <div className="flex justify-center mb-4">
                <FeatureIcon icon={Camera} variant="coin" />
              </div>
              <h4 className="font-semibold mb-2">Photo Updates</h4>
              <p className="text-sm text-neutral-600">Photos and activity reports</p>
            </div>
          </div>
        </div>

        {/* Pricing Information */}
        <div className="card-premium p-8 text-center">
          <h2 className="text-3xl font-bold mb-6">Transparent Pricing</h2>
          <p className="text-lg text-muted-foreground mb-6">
            We believe in clear, upfront pricing with no hidden fees. Contact us for detailed pricing information tailored to your pet's needs.
          </p>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div>
              <h4 className="font-semibold mb-2 text-primary">Daycare</h4>
              <p className="text-sm text-muted-foreground">Daily rates available</p>
              <p className="text-sm text-muted-foreground">Package deals for regular clients</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-secondary">Boarding</h4>
              <p className="text-sm text-muted-foreground">Nightly rates with discounts</p>
              <p className="text-sm text-muted-foreground">Extended stay packages</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-success">Trial Days</h4>
              <p className="text-sm text-muted-foreground">€20 mandatory assessment</p>
              <p className="text-sm text-muted-foreground">Required for all new customers</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}