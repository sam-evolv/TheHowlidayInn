import { Card, CardContent } from "@/components/ui/card";
import { PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <PawPrint className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--hi-brown)' }} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops! Page Not Found</h1>
          <p className="text-gray-600 mb-6">
            This page doesn't exist. Let's get you back on track.
          </p>
          <Link href="/">
            <Button className="w-full">Back to Homepage</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
