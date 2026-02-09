import { PawPrint, Facebook, Instagram, Twitter, Phone, Mail, MapPin, User, Shield } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "../auth/AuthProvider";
// Use the new Howliday Inn logo from brand assets
const logoImage = "/brand/howliday-logo-light.png";

export default function Footer() {
  const { user } = useAuth();
  
  return (
    <footer className="footer mt-8 sm:mt-12 md:mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          <div className="md:col-span-2">
            <div className="mb-4">
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex items-center group cursor-pointer inline-block border-0 bg-transparent p-0"
              >
                <img 
                  src={logoImage} 
                  alt="The Howliday Inn - Dog Daycare & Boarding" 
                  className="logo transition-all duration-300 group-hover:scale-110 drop-shadow-lg group-hover:drop-shadow-xl"
                />
              </button>
            </div>
            <p className="mb-4" style={{ color: 'var(--hi-cream)' }}>
              Premium daycare and boarding services for your beloved furry family members. 
              Licensed, insured, and dedicated to providing the best care possible.
            </p>
            <div className="flex space-x-4">
              <Facebook className="text-2xl cursor-pointer transition-colors duration-200" style={{ color: 'var(--hi-cream)' }} />
              <Instagram className="text-2xl cursor-pointer transition-colors duration-200" style={{ color: 'var(--hi-cream)' }} />
              <Twitter className="text-2xl cursor-pointer transition-colors duration-200" style={{ color: 'var(--hi-cream)' }} />
            </div>
          </div>
          
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Services</h4>
            <ul className="space-y-2" style={{ color: 'var(--hi-cream)' }}>
              <li><Link href="/daycare" className="hover:text-primary transition-colors duration-200">Daycare</Link></li>
              <li><Link href="/boarding" className="hover:text-primary transition-colors duration-200">Boarding</Link></li>
              <li><Link href="/trial" className="hover:text-primary transition-colors duration-200">Trial Days</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Contact</h4>
            <ul className="space-y-2" style={{ color: 'var(--hi-cream)' }}>
              <li className="flex items-center">
                <Phone className="mr-2 h-4 w-4" />
                <a href="tel:+353873345702" className="hover:opacity-80 transition-opacity">(087) 334-5702</a>
              </li>
              <li className="flex items-center">
                <Mail className="mr-2 h-4 w-4" />
                <a href="mailto:howlidayinn1@gmail.com" className="hover:opacity-80 transition-opacity">howlidayinn1@gmail.com</a>
              </li>
              <li className="flex items-center">
                <MapPin className="mr-2 h-4 w-4" />
                Kilgarvan, Curraghbinny
              </li>
              <li className="ml-6">Carrigaline, Co. Cork</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t mt-6 sm:mt-8 pt-4 sm:pt-6 pb-4 sm:pb-6" style={{ borderColor: 'var(--hi-border)', color: 'var(--hi-cream)' }}>
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm">
            <p className="mb-2 sm:mb-0">&copy; 2025 The Howliday Inn. All rights reserved.</p>
            <div className="flex items-center space-x-4">
              <a 
                href="https://www.evolvai.ie" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity duration-200"
                data-testid="link-evolvai"
              >
                Designed & Developed by EvolvAi
              </a>
              <a 
                href="/admin" 
                className="opacity-60 hover:opacity-100 transition-opacity duration-200" 
                style={{ color: 'var(--hi-cream)' }}
                title="Admin"
                data-testid="link-admin"
              >
                <Shield className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
