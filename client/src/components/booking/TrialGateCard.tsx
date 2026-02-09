import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, Clock } from "lucide-react";
import { Link } from "wouter";

interface TrialGateCardProps {
  dogName: string;
  reason: 'trial_required' | 'trial_cooldown';
  eligibleAt?: Date;
  className?: string;
}

export default function TrialGateCard({ dogName, reason, eligibleAt, className = "" }: TrialGateCardProps) {
  const isCooldown = reason === 'trial_cooldown';
  
  return (
    <Card className={`border-amber-200 bg-amber-50 ${className}`} data-testid="trial-gate-card">
      <CardHeader>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 mt-1" />
          <div className="flex-1">
            <CardTitle className="text-amber-900">
              {isCooldown ? 'Trial Day Completed - Service Available Tomorrow' : 'Trial Day Required'}
            </CardTitle>
            <CardDescription className="text-amber-700 mt-2">
              {isCooldown ? (
                <>
                  Great news! {dogName} has completed the Trial Day. You can book daycare or boarding starting{' '}
                  <span className="font-semibold">
                    {eligibleAt ? eligibleAt.toLocaleDateString('en-IE', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'tomorrow'}
                  </span>.
                </>
              ) : (
                <>
                  All new dogs must complete a Trial Day before booking daycare or boarding services. 
                  This helps us ensure {dogName} is comfortable and safe in our care.
                </>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isCooldown ? (
          <div className="bg-white rounded-lg p-4 border border-amber-200">
            <div className="flex items-center gap-2 text-amber-900 mb-2">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">Available Soon</span>
            </div>
            <p className="text-sm text-amber-700">
              You can book services for {dogName} starting at midnight tonight. 
              Check back tomorrow to make your reservation!
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg p-4 border border-amber-200">
              <h4 className="font-semibold text-amber-900 mb-2">What is a Trial Day?</h4>
              <p className="text-sm text-amber-700">
                A Trial Day is a single daycare session where we get to know {dogName}, assess their 
                temperament, and ensure they're a good fit for our group environment. It's just €20 
                and unlocks access to all our services.
              </p>
            </div>
            
            <Link href="/trial">
              <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white" data-testid="button-book-trial">
                <Calendar className="w-4 h-4 mr-2" />
                Book Trial Day for {dogName}
              </Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
