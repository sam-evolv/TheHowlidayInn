import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar } from "lucide-react";
import { Link } from "wouter";

interface TrialBannerProps {
  dogsNeedingTrial: Array<{ id: string; name: string }>;
  className?: string;
}

export default function TrialBanner({ dogsNeedingTrial, className = "" }: TrialBannerProps) {
  if (dogsNeedingTrial.length === 0) return null;

  const multiple = dogsNeedingTrial.length > 1;
  const dogNames = multiple 
    ? `${dogsNeedingTrial.slice(0, -1).map(d => d.name).join(', ')} and ${dogsNeedingTrial[dogsNeedingTrial.length - 1].name}`
    : dogsNeedingTrial[0].name;

  return (
    <Alert className={`border-amber-500 bg-amber-50 ${className}`} data-testid="trial-banner">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
      <AlertTitle className="text-amber-900 font-semibold">
        Trial Day Required
      </AlertTitle>
      <AlertDescription className="text-amber-800">
        <p className="mb-3">
          {dogNames} {multiple ? 'need' : 'needs'} to complete a Trial Day before you can book daycare or boarding services.
        </p>
        <Link href="/trial">
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" data-testid="button-book-trial-banner">
            <Calendar className="h-4 w-4 mr-2" />
            Book Trial Day
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}
