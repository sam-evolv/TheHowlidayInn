import HeroPremium from "@/components/HeroPremium";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sun, Moon, Heart, Award, Clock, UserCheck, Shield, Star, ArrowRight, Gift, PawPrint, Sparkles } from "lucide-react";
import buddyImage from "@assets/ChatGPT Image Aug 8, 2025 at 10_23_29 PM_1754688615981.png";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background">
      {/* Premium Hero Section with Video */}
      <HeroPremium />
      
      {/* Keep the rest of the old layout but remove the static image hero */}
      <section className="relative overflow-hidden" style={{ display: 'none' }}>
        {/* This old hero section is now hidden */}
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-32 lg:py-40 text-center z-10">
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-white/20 backdrop-blur-sm text-white font-medium text-sm mb-8 animate-scale-in stagger-delay-1 border border-white/30">
              <Star className="mr-2 h-4 w-4 text-amber-300" />
              Ireland's Premier Dog Care Experience
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-black mb-8 animate-fade-in stagger-delay-2 text-white drop-shadow-2xl leading-tight">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent drop-shadow-lg block lg:inline">
                The Howliday Inn
              </span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-white/90 mb-12 max-w-4xl mx-auto leading-relaxed animate-fade-in stagger-delay-3 drop-shadow-lg font-medium">
              Where your beloved companions experience luxury care in a home-away-from-home environment. 
              Professional, caring, and tailored to every dog's unique needs.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center max-w-lg mx-auto animate-fade-in stagger-delay-4">
              <Link href="/daycare" className="group" onClick={() => setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)}>
                <Button className="btn-primary px-8 py-4 text-base w-full sm:w-auto group-hover:scale-110 transition-all duration-300 shadow-2xl hover:shadow-primary/50">
                  <Sun className="mr-3 h-5 w-5" />
                  Book Daycare
                  <ArrowRight className="ml-3 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/boarding" className="group">
                <Button className="btn-secondary px-8 py-4 text-base w-full sm:w-auto group-hover:scale-105 transition-transform duration-300">
                  <Moon className="mr-3 h-5 w-5" />
                  Book Boarding
                  <ArrowRight className="ml-3 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Floating elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full blur-xl animate-pulse opacity-70"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-secondary/10 rounded-full blur-2xl animate-pulse opacity-50"></div>
      </section>
      {/* Services Overview */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">Our Premium Services</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Discover our range of professional dog care services, each designed with your pet's comfort and happiness in mind.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Daycare Card */}
          <div className="card-premium p-8 group animate-fade-in stagger-delay-1 flex flex-col">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
              <div className="relative w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-2xl border border-primary/20">
                <Sun className="text-white h-12 w-12 drop-shadow-lg" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold mb-4 text-gradient-primary">Daycare Services</h3>
            <p className="text-muted-foreground mb-8 leading-relaxed text-lg">
              Same-day care with flexible schedules designed around your busy lifestyle. Professional supervision and premium facilities.
            </p>
            
            <div className="space-y-4 mb-8 flex-1">
              <div className="flex items-center group/item">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center mr-4 group-hover/item:scale-110 transition-all duration-200 shadow-lg border border-primary/20">
                  <Clock className="text-white h-5 w-5 drop-shadow-sm" />
                </div>
                <span className="font-semibold text-foreground">8-10 AM Drop-off Window</span>
              </div>
              <div className="flex items-center group/item">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center mr-4 group-hover/item:scale-110 transition-all duration-200 shadow-lg border border-primary/20">
                  <Clock className="text-white h-5 w-5 drop-shadow-sm" />
                </div>
                <span className="font-semibold text-foreground">4-6 PM Pickup Window</span>
              </div>
              <div className="flex items-center group/item">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center mr-4 group-hover/item:scale-110 transition-all duration-200 shadow-lg border border-primary/20">
                  <Shield className="text-white h-5 w-5 drop-shadow-sm" />
                </div>
                <span className="font-semibold text-foreground">Premium Supervision</span>
              </div>
            </div>
            
            <Link href="/daycare" className="block" onClick={() => setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)}>
              <Button className="w-full btn-primary py-3 text-base group-hover:scale-[1.02] transition-transform duration-300">
                Book Daycare
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Boarding Card */}
          <div className="card-premium p-8 group animate-fade-in stagger-delay-2 flex flex-col">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-secondary to-secondary/80 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
              <div className="relative w-20 h-20 bg-gradient-to-br from-secondary to-secondary/80 rounded-2xl flex items-center justify-center shadow-2xl border border-secondary/20">
                <Moon className="text-white h-12 w-12 drop-shadow-lg" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold mb-4 text-gradient-secondary">Boarding Services</h3>
            <p className="text-muted-foreground mb-8 leading-relaxed text-lg">
              Overnight luxury accommodations with round-the-clock care. Your pet's premium home away from home experience.
            </p>
            
            <div className="space-y-4 mb-8 flex-1">
              <div className="flex items-center group/item">
                <div className="w-10 h-10 bg-gradient-to-br from-secondary to-secondary/80 rounded-xl flex items-center justify-center mr-4 group-hover/item:scale-110 transition-all duration-200 shadow-lg border border-secondary/20">
                  <Shield className="text-white h-5 w-5 drop-shadow-sm" />
                </div>
                <span className="font-semibold text-foreground">24/7 Professional Care</span>
              </div>
              <div className="flex items-center group/item">
                <div className="w-10 h-10 bg-gradient-to-br from-secondary to-secondary/80 rounded-xl flex items-center justify-center mr-4 group-hover/item:scale-110 transition-all duration-200 shadow-lg border border-secondary/20">
                  <Heart className="text-white h-5 w-5 drop-shadow-sm" />
                </div>
                <span className="font-semibold text-foreground">Luxury Private Suites</span>
              </div>
              <div className="flex items-center group/item">
                <div className="w-10 h-10 bg-gradient-to-br from-secondary to-secondary/80 rounded-xl flex items-center justify-center mr-4 group-hover/item:scale-110 transition-all duration-200 shadow-lg border border-secondary/20">
                  <UserCheck className="text-white h-5 w-5 drop-shadow-sm" />
                </div>
                <span className="font-semibold text-foreground">Daily Photo Updates</span>
              </div>
            </div>
            
            <Link href="/boarding" className="block" onClick={() => setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)}>
              <Button className="w-full btn-secondary py-3 text-base group-hover:scale-[1.02] transition-transform duration-300">
                Book Boarding
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Trial Card */}
          <div className="card-premium p-8 group animate-fade-in stagger-delay-3 flex flex-col">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
              <div className="relative w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-2xl border border-green-500/20">
                <Star className="text-white h-12 w-12 drop-shadow-lg" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
              Trial Day Service
            </h3>
            <p className="text-muted-foreground mb-8 leading-relaxed text-lg">
              New to The Howliday Inn? Begin your journey with our complimentary trial day assessment and premium meet & greet.
            </p>
            
            <div className="space-y-4 mb-8 flex-1">
              <div className="flex items-center group/item">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mr-4 group-hover/item:scale-110 transition-all duration-200 shadow-lg border border-green-500/20">
                  <Gift className="text-white h-5 w-5 drop-shadow-sm" />
                </div>
                <span className="font-semibold text-foreground">Complimentary Trial Day</span>
              </div>
              <div className="flex items-center group/item">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mr-4 group-hover/item:scale-110 transition-all duration-200 shadow-lg border border-green-500/20">
                  <Heart className="text-white h-5 w-5 drop-shadow-sm" />
                </div>
                <span className="font-semibold text-foreground">Personal Meet & Greet</span>
              </div>
              <div className="flex items-center group/item">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mr-4 group-hover/item:scale-110 transition-all duration-200 shadow-lg border border-green-500/20">
                  <UserCheck className="text-white h-5 w-5 drop-shadow-sm" />
                </div>
                <span className="font-semibold text-foreground">Premium Assessment</span>
              </div>
            </div>
            
            <Link href="/trial" className="block" onClick={() => setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)}>
              <Button className="w-full btn-success py-3 text-base group-hover:scale-[1.02] transition-transform duration-300">
                Schedule Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
      {/* Why Choose Us */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">Why Choose The Howliday Inn?</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Experience the difference that professional care and genuine love for animals makes.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="text-center group animate-fade-in stagger-delay-1">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
              <div className="relative w-18 h-18 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mx-auto shadow-2xl border border-primary/20">
                <Award className="text-white h-10 w-10 drop-shadow-lg" />
              </div>
            </div>
            <h4 className="text-xl font-bold mb-3 text-foreground">Licensed & Insured</h4>
            <p className="text-muted-foreground leading-relaxed">Fully licensed facility with comprehensive insurance coverage for complete peace of mind</p>
          </div>
          
          <div className="text-center group animate-fade-in stagger-delay-2">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-secondary to-secondary/80 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
              <div className="relative w-18 h-18 bg-gradient-to-br from-secondary to-secondary/80 rounded-2xl flex items-center justify-center mx-auto shadow-2xl border border-secondary/20">
                <Clock className="text-white h-10 w-10 drop-shadow-lg" />
              </div>
            </div>
            <h4 className="text-xl font-bold mb-3 text-foreground">Flexible Hours</h4>
            <p className="text-muted-foreground leading-relaxed">Convenient drop-off and pickup times designed to fit seamlessly with your busy schedule</p>
          </div>
          
          <div className="text-center group animate-fade-in stagger-delay-3">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
              <div className="relative w-18 h-18 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl border border-green-500/20">
                <Shield className="text-white h-10 w-10 drop-shadow-lg" />
              </div>
            </div>
            <h4 className="text-xl font-bold mb-3 text-foreground">Safe Environment</h4>
            <p className="text-muted-foreground leading-relaxed">Secure, clean facility with safety protocols and emergency procedures as our top priority</p>
          </div>

        </div>
      </section>

      {/* Dog of the Month Section */}
      <section className="py-20 bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in">
            <div className="inline-flex items-center justify-center space-x-2 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                <PawPrint className="text-white h-6 w-6" />
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Dog of the Month
              </h2>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Meet our furry friend who's been spreading the most joy and tail wags this month! 🐾
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="overflow-hidden shadow-2xl border-0 bg-white/80 backdrop-blur-sm animate-fade-in stagger-delay-1">
              <div className="grid lg:grid-cols-2 gap-0">
                {/* Dog Photo */}
                <div className="relative lg:aspect-square overflow-hidden">
                  <img 
                    src={buddyImage}
                    alt="Buddy the Golden Retriever - Dog of the Month"
                    className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                  <div className="absolute top-4 right-4">
                    <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                      ⭐ Star Pup
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg">
                      <p className="text-sm font-medium text-gray-800">📸 Professional Portrait</p>
                    </div>
                  </div>
                </div>

                {/* Dog Info */}
                <div className="p-8 lg:p-12 space-y-6">
                  <div>
                    <h3 className="text-3xl font-bold text-foreground mb-2">
                      Buddy the Golden Retriever 🎾
                    </h3>
                    <p className="text-primary font-semibold mb-4">Age: 4 years old</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-foreground mb-2 flex items-center">
                        <Heart className="h-5 w-5 text-pink-500 mr-2" />
                        Why we love Buddy:
                      </h4>
                      <p className="text-muted-foreground leading-relaxed">
                        Buddy is the ultimate gentleman! He's always the first to welcome new friends with a gentle tail wag 
                        and has mastered the art of the perfect fetch throw-back. His favorite activity? Playing lifeguard 
                        during pool time - he takes his job very seriously!
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-foreground mb-2 flex items-center">
                        <Sparkles className="h-5 w-5 text-purple-500 mr-2" />
                        Special talents:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium">
                          Professional Greeter
                        </span>
                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                          Fetch Champion
                        </span>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          Treat Connoisseur
                        </span>
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                          Nap Enthusiast
                        </span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground italic text-center">
                        "Buddy always brightens our day with his gentle spirit and playful energy. 
                        He's truly a special part of our Howliday Inn family!" 
                        <span className="font-semibold">- The Howliday Inn Team</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="text-center mt-12 animate-fade-in stagger-delay-2">
            <p className="text-muted-foreground mb-6">
              Could your furry friend be our next Dog of the Month? Book a stay and let their personality shine! ✨
            </p>
            <Link href="/daycare">
              <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                Book Your Pup's Adventure
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
