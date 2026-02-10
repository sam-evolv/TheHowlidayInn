import { useLocation } from 'wouter';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react';

export default function CancelPage() {
  const [, setLocation] = useLocation();
  const [bookingId, setBookingId] = useState<string>('');

  useEffect(() => {
    // Get booking ID from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('bookingId');
    if (id) {
      setBookingId(id);
    }
  }, []);

  return (
    <div className="container mx-auto px-4 pb-16 page-content">
      <div className="max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto mb-4">
              <XCircle className="w-16 h-16" style={{ color: 'var(--hi-danger)' }} />
            </div>
            <CardTitle className="text-2xl" style={{ color: 'var(--hi-danger)' }}>
              Payment Cancelled
            </CardTitle>
            <CardDescription>
              Your payment was cancelled and no charges were made.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {bookingId && (
              <div className="p-4 rounded-lg" style={{ background: 'var(--hi-cream)', border: '1px solid var(--hi-border)' }}>
                <p className="text-sm" style={{ color: 'var(--hi-brown)' }}>Booking Reference</p>
                <p className="font-mono text-lg font-semibold" data-testid="text-booking-id">
                  {bookingId}
                </p>
                <p className="text-sm mt-2" style={{ color: 'var(--hi-danger)' }}>
                  This booking is still pending payment
                </p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold">What would you like to do?</h3>
              <p className="text-sm" style={{ color: 'var(--hi-brown)' }}>
                Don't worry - your booking details are saved. You can complete your payment 
                anytime or contact us if you need assistance.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => setLocation('/services')} 
                className="w-full"
                data-testid="button-try-again"
              >
                Try Payment Again
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setLocation('/dashboard')} 
                className="w-full"
                data-testid="button-view-bookings"
              >
                View My Bookings
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setLocation('/')} 
                className="w-full"
                data-testid="button-home"
              >
                Return Home
              </Button>
            </div>

            <div className="p-4 rounded-lg" style={{ background: 'var(--hi-cream)', border: '1px solid var(--hi-border)' }}>
              <h4 className="font-semibold mb-2" style={{ color: 'var(--hi-brown)' }}>Need Help?</h4>
              <p className="text-sm" style={{ color: 'var(--hi-brown)' }}>
                If you're having trouble with payment or have questions about your booking, 
                our team is here to help.
              </p>
            </div>

            <div className="text-center text-sm" style={{ color: 'var(--hi-brown)' }}>
              <p>Contact us for assistance:</p>
              <p>
                <strong>Phone:</strong> <a href="tel:+353873345702" style={{ color: 'var(--hi-brown)' }} className="hover:underline">(087) 334-5702</a><br />
                <strong>Email:</strong> <a href="mailto:howlidayinn1@gmail.com" style={{ color: 'var(--hi-brown)' }} className="hover:underline">howlidayinn1@gmail.com</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}