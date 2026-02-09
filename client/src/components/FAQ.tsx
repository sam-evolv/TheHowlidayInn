import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const faqData = [
  {
    question: "What are your opening hours?",
    answer: "Monday–Friday 8–10am or 4–6pm. Saturday 9–11am or 4–6pm. Sunday 4–6pm only. Boarding arrivals and collections happen within these windows; out-of-hours by prior arrangement."
  },
  {
    question: "What vaccinations does my dog need?",
    answer: "All dogs must have current Rabies vaccination (within 12 months), DHPP vaccination (within 12 months), and Bordetella vaccination (within 6 months). You'll need to upload vaccination records during the booking process. We can help you get these from your vet if needed."
  },
  {
    question: "Do you accept all dog breeds?",
    answer: "We welcome most dog breeds, but for the safety of all our guests, we have restrictions on certain breeds. During booking, our system will check your dog's breed against our policy. If there are any concerns, we'll work with you to find alternative care solutions."
  },
  {
    question: "Can I bring my dog's food and toys?",
    answer: "Absolutely! We encourage bringing your dog's regular food to maintain their routine and prevent stomach upset. Comfort items like blankets, toys, or beds are welcome and help your dog feel more at home during their stay."
  },
  {
    question: "How far in advance should I book?",
    answer: "We're flexible with booking times, but we do recommend booking early for holidays or peak periods (2-3 weeks ahead is ideal). All first-time guests must complete a paid Trial Day before accessing daycare or boarding services."
  },
  {
    question: "What if I need to cancel my booking?",
    answer: "Full refund with 48 hours cancellation notice. During peak season (May-September) 72 hours notice is required."
  },
  {
    question: "How do you handle dogs with special needs or medications?",
    answer: "We're experienced in caring for dogs with special needs and can administer medications as prescribed. Please provide detailed instructions during booking and bring medications in original containers with clear labeling. Our staff will ensure your dog receives proper care."
  },
  {
    question: "What happens if my dog gets sick while in your care?",
    answer: "Your dog's health and safety are our top priority. We monitor all dogs closely and have protocols for health concerns. We'll contact you immediately if any issues arise and can arrange veterinary care if needed. We work with local vets and have emergency procedures in place."
  },
  {
    question: "Do you provide transportation services?",
    answer: "Currently, we don't offer transportation services, but we can recommend trusted pet transport services in the area. We're conveniently located with easy parking for drop-off and pickup."
  }
];

export default function FAQ() {
  const faqRef = useScrollAnimation();
  
  return (
    <section ref={faqRef} className="py-16 sm:py-20 md:py-28 bg-gray-50 dark:bg-gray-800 scroll-animate-out">
      <div className="container mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-center mb-14 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Get answers to common questions about our services, policies, and what to expect when you choose The Howliday Inn
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqData.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-6 py-2 shadow-sm hover:shadow-md transition-shadow"
                data-testid={`faq-item-${index}`}
              >
                <AccordionTrigger className="faq-trigger text-left font-semibold text-gray-900 dark:text-white transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-700 dark:text-gray-300 leading-relaxed pt-2">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Still have questions? We'd love to help!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a 
              href="tel:+353873345702"
              className="faq-contact-link inline-flex items-center gap-2 font-semibold transition-colors"
              style={{color: "var(--hi-brown)"}}
              data-testid="link-faq-phone"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              Call us at (087) 334-5702
            </a>
            <span className="text-gray-400">or</span>
            <a 
              href="mailto:howlidayinn1@gmail.com"
              className="faq-contact-link inline-flex items-center gap-2 font-semibold transition-colors"
              style={{color: "var(--hi-brown)"}}
              data-testid="link-faq-email"
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