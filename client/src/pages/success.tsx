import { useLocation } from 'wouter';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function SuccessPage() {
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
    <div className="min-h-screen flex items-center justify-center py-20 px-4">
      <div className="max-w-2xl w-full">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto mb-4">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-700">
              Payment Successful! 🎉
            </CardTitle>
            <CardDescription>
              Your booking has been confirmed and payment processed successfully.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {bookingId && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Booking Reference</p>
                <p className="font-mono text-lg font-semibold" data-testid="text-booking-id">
                  {bookingId}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold">What happens next?</h3>
              <div className="text-left space-y-2">
                <div className="flex items-start">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">1</span>
                  <p className="text-sm">You'll receive a confirmation email with all booking details</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">2</span>
                  <p className="text-sm">Please arrive during your selected drop-off time</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">3</span>
                  <p className="text-sm">Bring any special instructions or medications for your dog</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">Important Reminders</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Ensure your dog's vaccinations are up to date</li>
                <li>• Bring vaccination records if requested</li>
                <li>• Contact us if you need to make any changes</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => setLocation('/account')} 
                className="w-full"
                data-testid="button-view-bookings"
              >
                View My Account
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setLocation('/services')} 
                className="w-full"
                data-testid="button-book-another"
              >
                Book Another Service
              </Button>
            </div>

            <div className="text-center text-sm text-gray-500">
              <p>Questions about your booking?</p>
              <p>
                <strong>Phone:</strong> <a href="tel:+353873345702" className="text-blue-600 hover:underline">(087) 334-5702</a><br />
                <strong>Email:</strong> <a href="mailto:howlidayinn1@gmail.com" className="text-blue-600 hover:underline">howlidayinn1@gmail.com</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}