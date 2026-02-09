import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export default function Cancel() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <XCircle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <CardTitle className="text-2xl text-gray-900">Payment Cancelled</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-700">Your payment was cancelled and no charges were made.</p>
            <p className="text-gray-600 text-sm mt-2">Your booking has not been confirmed.</p>
          </div>

          <p className="text-gray-600">
            You can return to the booking page to try again, or contact us if you need assistance.
          </p>

          <div className="space-y-3">
            <Link href="/daycare">
              <Button className="w-full" data-testid="button-try-daycare-again">
                Try Daycare Booking Again
              </Button>
            </Link>
          </div>

          <div className="mt-4">
            <Link href="/boarding">
              <Button variant="outline" className="w-full" data-testid="button-try-boarding-again">
                Try Boarding Booking Again
              </Button>
            </Link>
          </div>

          <div className="mt-4">
            <Link href="/">
              <Button variant="ghost" className="w-full" data-testid="button-back-home">
                Return to Home
              </Button>
            </Link>
          </div>

          <p className="text-xs text-gray-500">
            Need help? Contact us at <a href="mailto:howlidayinn1@gmail.com" className="text-purple-600 underline">howlidayinn1@gmail.com</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
