import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function Success() {
  const [status, setStatus] = useState<'checking'|'paid'|'unpaid'|'error'>('checking');
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get('session_id');
    
    if (!sessionId) { 
      setStatus('error'); 
      return; 
    }
    
    api.get('/api/payments/verify', { params: { session_id: sessionId } })
      .then(r => {
        setMetadata(r.data.metadata);
        setStatus(r.data.paid ? 'paid' : 'unpaid');
      })
      .catch(() => setStatus('error'));
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-12">
            <Loader2 className="h-12 w-12 text-purple-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Finalising your booking...</h2>
            <p className="text-gray-600">Please wait while we confirm your payment.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'paid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-2xl text-gray-900">Payment Successful! 🎉</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">Your booking has been confirmed</p>
              <p className="text-green-700 text-sm mt-1">A confirmation email has been sent to your inbox.</p>
            </div>

            {metadata && (
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-gray-900 mb-2">Booking Details</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  {metadata.service && <p><strong>Service:</strong> {metadata.service}</p>}
                  {metadata.date && <p><strong>Date:</strong> {metadata.date}</p>}
                  {metadata.bookingId && (
                    <p><strong>Reference:</strong> <span className="font-mono">{metadata.bookingId.substring(0, 8)}</span></p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Link href="/">
                <Button className="w-full" data-testid="button-back-home">
                  Return to Home
                </Button>
              </Link>
              <p className="text-xs text-gray-500">
                Questions? Contact us at <a href="mailto:howlidayinn1@gmail.com" className="text-purple-600 underline">howlidayinn1@gmail.com</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'unpaid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 text-orange-600 mx-auto mb-4" />
            <CardTitle className="text-2xl text-gray-900">Payment Pending</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-gray-600">
              We could not confirm your payment yet. This might take a few moments to process.
            </p>
            <p className="text-gray-600">
              If you've completed payment, please check your email for confirmation. Otherwise, please contact support with your email address.
            </p>
            <div className="space-y-3">
              <Link href="/">
                <Button variant="outline" className="w-full" data-testid="button-back-home">
                  Return to Home
                </Button>
              </Link>
              <p className="text-xs text-gray-500">
                Contact: <a href="mailto:howlidayinn1@gmail.com" className="text-purple-600 underline">howlidayinn1@gmail.com</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <CardTitle className="text-2xl text-gray-900">Error Confirming Payment</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-gray-600">
            There was an error confirming your payment. Please contact support with your booking details.
          </p>
          <div className="space-y-3">
            <Link href="/">
              <Button variant="outline" className="w-full" data-testid="button-back-home">
                Return to Home
              </Button>
            </Link>
            <p className="text-xs text-gray-500">
              Email: <a href="mailto:howlidayinn1@gmail.com" className="text-purple-600 underline">howlidayinn1@gmail.com</a> | 
              Phone: <a href="tel:+353873345702" className="text-purple-600 underline">(087) 334-5702</a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
