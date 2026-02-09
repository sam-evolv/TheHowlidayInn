import { Heart, Award, Shield, Clock, Star } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { FeatureIcon } from "@/components/FeatureIcon";

export default function About() {
  const storyRef = useScrollAnimation();
  const missionRef = useScrollAnimation();
  const teamRef = useScrollAnimation();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/20 page-enter">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-success/5"></div>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-5xl lg:text-7xl font-bold mb-6 text-gradient-primary animate-fade-in">
            About Us
          </h1>
          <p className="text-xl lg:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed animate-fade-in stagger-delay-1">
            Dedicated to providing exceptional care for your beloved furry family members since our founding.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section ref={storyRef} className="max-w-7xl mx-auto px-6 lg:px-8 py-16 scroll-animate-out">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="animate-fade-in">
            <h2 className="text-4xl font-bold mb-6">Our Story</h2>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              Founded by passionate animal lovers in the heart of County Cork, The Howliday Inn began as a dream to create a sanctuary where dogs could feel as comfortable and loved as they do at home.
            </p>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              Our founders recognised the need for premium pet care services that prioritise not just safety and supervision, but genuine love and attention for each individual animal in our care.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Today, we're proud to serve the community with state-of-the-art facilities, professionally trained staff, and an unwavering commitment to treating every pet like family.
            </p>
          </div>
          <div className="relative animate-fade-in stagger-delay-1">
            <div className="w-full h-96 bg-gradient-to-br from-primary/20 via-secondary/20 to-success/20 rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <Heart className="h-24 w-24 text-primary mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Caring for pets since 2018</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission */}
      <section ref={missionRef} className="bg-gradient-to-r from-primary/5 to-secondary/5 py-16 scroll-animate-out">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold mb-6">Our Mission & Values</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We're committed to providing exceptional care that gives pet owners complete peace of mind.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group animate-fade-in stagger-delay-1">
              <div className="flex justify-center mb-4">
                <FeatureIcon icon={Heart} variant="coin" />
              </div>
              <h3 className="text-xl font-bold mb-2">Love & Compassion</h3>
              <p className="text-neutral-600 leading-relaxed">
                Every interaction is guided by genuine love and understanding of each pet's unique personality and needs.
              </p>
            </div>

            <div className="text-center group animate-fade-in stagger-delay-2">
              <div className="flex justify-center mb-4">
                <FeatureIcon icon={Shield} variant="coin" />
              </div>
              <h3 className="text-xl font-bold mb-2">Safety & Security</h3>
              <p className="text-neutral-600 leading-relaxed">
                Rigorous safety protocols, secure facilities, and constant supervision ensure your pet's wellbeing at all times.
              </p>
            </div>

            <div className="text-center group animate-fade-in stagger-delay-3">
              <div className="flex justify-center mb-4">
                <FeatureIcon icon={Award} variant="coin" />
              </div>
              <h3 className="text-xl font-bold mb-2">Excellence & Quality</h3>
              <p className="text-neutral-600 leading-relaxed">
                We continuously strive for the highest standards in pet care, facilities, and customer service.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Founder */}
      <section ref={teamRef} className="max-w-7xl mx-auto px-6 lg:px-8 py-16 scroll-animate-out">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl font-bold mb-6">Our Founder</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            The heart and hands behind The Howliday Inn
          </p>
        </div>

        <div className="flex justify-center">
          <div 
            className="card-premium p-10 text-center animate-fade-in max-w-[800px] w-full shadow-lg transition hover:shadow-xl" 
            aria-label="Founder Profile"
          >
            <div className="flex justify-center mb-6">
              <FeatureIcon icon={Heart} variant="coin" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Chloe McCullagh</h3>
            <p className="text-[#1B5E4A] font-semibold text-lg mb-6">Founder & Lead Caregiver</p>
            <p className="text-base text-neutral-700 leading-relaxed mb-4">
              With over 15 years of hands-on experience in animal care, Chloe founded The Howliday Inn to bring a calm, professional, and home-like environment to every dog in her care. Her background includes advanced certifications in pet behaviour, safety, and welfare — with a focus on understanding each dog's individual temperament and needs.
            </p>
            <p className="text-base text-neutral-700 leading-relaxed">
              Chloe personally oversees every aspect of The Howliday Inn's daily operations, ensuring that standards of care, cleanliness, and comfort remain exceptional. Her approach combines professional training with genuine attention to detail, setting the tone for a facility built on trust and quality.
            </p>
          </div>
        </div>
      </section>

      {/* Facilities */}
      <section className="bg-gradient-to-r from-secondary/5 to-success/5 py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold mb-6">Our Facilities</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              State-of-the-art facilities designed with your pet's comfort, safety, and enjoyment in mind.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="card-premium p-8 animate-fade-in stagger-delay-1 transition shadow-sm hover:shadow-md hover:-translate-y-[2px]">
              <h3 className="text-2xl font-bold mb-4 text-[#1B5E4A]">Indoor Play Areas</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm leading-relaxed">
                  <Star className="h-5 w-5 text-[#1B5E4A] flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span className="text-neutral-800">Climate-controlled environments</span>
                </li>
                <li className="flex items-start gap-3 text-sm leading-relaxed">
                  <Star className="h-5 w-5 text-[#1B5E4A] flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span className="text-neutral-800">Non-slip flooring for safety</span>
                </li>
                <li className="flex items-start gap-3 text-sm leading-relaxed">
                  <Star className="h-5 w-5 text-[#1B5E4A] flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span className="text-neutral-800">Separate areas for different sized dogs</span>
                </li>
                <li className="flex items-start gap-3 text-sm leading-relaxed">
                  <Star className="h-5 w-5 text-[#1B5E4A] flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span className="text-neutral-800">Interactive toys and enrichment activities</span>
                </li>
              </ul>
            </div>

            <div className="card-premium p-8 animate-fade-in stagger-delay-2 transition shadow-sm hover:shadow-md hover:-translate-y-[2px]">
              <h3 className="text-2xl font-bold mb-4 text-[#1B5E4A]">Outdoor Exercise Yards</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm leading-relaxed">
                  <Star className="h-5 w-5 text-[#1B5E4A] flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span className="text-neutral-800">Secure double-gated entry system</span>
                </li>
                <li className="flex items-start gap-3 text-sm leading-relaxed">
                  <Star className="h-5 w-5 text-[#1B5E4A] flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span className="text-neutral-800">Artificial turf areas</span>
                </li>
                <li className="flex items-start gap-3 text-sm leading-relaxed">
                  <Star className="h-5 w-5 text-[#1B5E4A] flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span className="text-neutral-800">Agility equipment for mental stimulation</span>
                </li>
                <li className="flex items-start gap-3 text-sm leading-relaxed">
                  <Star className="h-5 w-5 text-[#1B5E4A] flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span className="text-neutral-800">Covered areas for all-weather play</span>
                </li>
              </ul>
            </div>

            <div className="card-premium p-8 animate-fade-in stagger-delay-3 transition shadow-sm hover:shadow-md hover:-translate-y-[2px]">
              <h3 className="text-2xl font-bold mb-4 text-[#1B5E4A]">Boarding Accommodation</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm leading-relaxed">
                  <Star className="h-5 w-5 text-[#1B5E4A] flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span className="text-neutral-800">Comfortable bedding and sleeping areas</span>
                </li>
                <li className="flex items-start gap-3 text-sm leading-relaxed">
                  <Star className="h-5 w-5 text-[#1B5E4A] flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span className="text-neutral-800">Climate-controlled indoor environment</span>
                </li>
                <li className="flex items-start gap-3 text-sm leading-relaxed">
                  <Star className="h-5 w-5 text-[#1B5E4A] flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span className="text-neutral-800">Space for personal belongings and toys</span>
                </li>
                <li className="flex items-start gap-3 text-sm leading-relaxed">
                  <Star className="h-5 w-5 text-[#1B5E4A] flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span className="text-neutral-800">Quiet rest areas away from activity zones</span>
                </li>
              </ul>
            </div>

            <div className="card-premium p-8 animate-fade-in stagger-delay-4 transition shadow-sm hover:shadow-md hover:-translate-y-[2px]">
              <h3 className="text-2xl font-bold mb-4 text-[#1B5E4A]">Health & Safety Features</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm leading-relaxed">
                  <Star className="h-5 w-5 text-[#1B5E4A] flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span className="text-neutral-800">On-site isolation areas for health monitoring</span>
                </li>
                <li className="flex items-start gap-3 text-sm leading-relaxed">
                  <Star className="h-5 w-5 text-[#1B5E4A] flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span className="text-neutral-800">Emergency veterinary partnerships</span>
                </li>
                <li className="flex items-start gap-3 text-sm leading-relaxed">
                  <Star className="h-5 w-5 text-[#1B5E4A] flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span className="text-neutral-800">Regular sanitisation protocols</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="card-premium p-8 text-center">
          <h2 className="text-3xl font-bold mb-6">Visit Us Today</h2>
          <p className="text-lg text-muted-foreground mb-6">
            We'd love to meet you and your furry friend! Schedule a tour of our facilities and see why The Howliday Inn is the perfect choice for your pet's care.
          </p>
          <div className="grid md:grid-cols-3 gap-6 text-left max-w-2xl mx-auto">
            <div>
              <h4 className="font-semibold mb-2 text-primary">Location</h4>
              <p className="text-sm text-muted-foreground">Kilgarvan, Curraghbinny</p>
              <p className="text-sm text-muted-foreground">Carrigaline, Co. Cork</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-secondary">Hours</h4>
              <p className="text-sm text-muted-foreground">Monday-Friday: 8am-10am & 4pm-6pm</p>
              <p className="text-sm text-muted-foreground">Saturday: 9am-11am & 4pm-6pm</p>
              <p className="text-sm text-muted-foreground">Sunday: 4pm-6pm only</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-success">Contact</h4>
              <p className="text-sm text-muted-foreground">Phone: <a href="tel:+353873345702" className="hover:underline">(087) 334-5702</a></p>
              <p className="text-sm text-muted-foreground">Email: <a href="mailto:howlidayinn1@gmail.com" className="hover:underline">howlidayinn1@gmail.com</a></p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}