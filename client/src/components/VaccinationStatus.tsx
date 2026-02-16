import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { FirebaseDog } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";

interface VaccinationStatusProps {
  dog: FirebaseDog;
  className?: string;
}

export default function VaccinationStatus({ dog, className = "" }: VaccinationStatusProps) {
  // Fetch vaccination requirements from settings
  const { data: settings } = useQuery({
    queryKey: ['/api/settings/public'],
  });

  const today = new Date();
  const requiredVaccines = (settings as any)?.requiredVaccines || [
    { type: "rabies", label: "Rabies" },
    { type: "dhpp", label: "DHPP" },
    { type: "kennel_cough", label: "Bordetella" }
  ];
  
  // Check vaccination status based on settings requirements and dog data structure
  const vaccinationStatus = requiredVaccines.map((required: any) => {
    let isValid = false;
    
    // Handle different data structures - Firebase vs API
    if (dog.vaccinations) {
      if (required.type === "rabies" && dog.vaccinations.rabiesDate) {
        isValid = new Date(dog.vaccinations.rabiesDate) > new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
      } else if (required.type === "dhpp" && dog.vaccinations.dhppDate) {
        isValid = new Date(dog.vaccinations.dhppDate) > new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
      } else if (required.type === "kennel_cough" && dog.vaccinations.bordetellaDate) {
        isValid = new Date(dog.vaccinations.bordetellaDate) > new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);
      }
    }
    
    return {
      type: required.type,
      label: required.label,
      isValid
    };
  });

  const allValid = vaccinationStatus.length > 0 && vaccinationStatus.every((v: any) => v.isValid);
  const someValid = vaccinationStatus.some((v: any) => v.isValid);
  const isRabiesValid = vaccinationStatus.find((v: any) => v.type === "rabies")?.isValid ?? false;
  const isDhppValid = vaccinationStatus.find((v: any) => v.type === "dhpp")?.isValid ?? false;
  const isBordetellaValid = vaccinationStatus.find((v: any) => v.type === "kennel_cough")?.isValid ?? false;

  const getOverallStatus = () => {
    if (allValid) return { status: 'complete', icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200' };
    if (someValid) return { status: 'partial', icon: AlertCircle, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    return { status: 'incomplete', icon: XCircle, color: 'bg-red-100 text-red-800 border-red-200' };
  };

  const overall = getOverallStatus();
  const StatusIcon = overall.icon;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Overall Status Badge */}
      <Badge className={`${overall.color} flex items-center gap-2 px-3 py-1`} data-testid="vaccination-overall-status">
        <StatusIcon className="w-4 h-4" />
        <span className="font-medium">
          {overall.status === 'complete' && 'Vaccinations Current'}
          {overall.status === 'partial' && 'Vaccinations Incomplete'}
          {overall.status === 'incomplete' && 'Vaccinations Required'}
        </span>
      </Badge>

      {/* Individual Vaccination Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Badge 
          variant="outline" 
          className={`flex items-center gap-2 px-2 py-1 ${isRabiesValid ? 'border-green-200 text-green-700' : 'border-red-200 text-red-700'}`}
          data-testid="vaccination-rabies-status"
        >
          {isRabiesValid ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          <span className="text-xs">Rabies</span>
        </Badge>

        <Badge 
          variant="outline" 
          className={`flex items-center gap-2 px-2 py-1 ${isDhppValid ? 'border-green-200 text-green-700' : 'border-red-200 text-red-700'}`}
          data-testid="vaccination-dhpp-status"
        >
          {isDhppValid ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          <span className="text-xs">DHPP</span>
        </Badge>

        <Badge 
          variant="outline" 
          className={`flex items-center gap-2 px-2 py-1 ${isBordetellaValid ? 'border-green-200 text-green-700' : 'border-red-200 text-red-700'}`}
          data-testid="vaccination-bordetella-status"
        >
          {isBordetellaValid ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          <span className="text-xs">Bordetella</span>
        </Badge>
      </div>

      {/* Vaccination Details */}
      {!allValid && (
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          {!isRabiesValid && (
            <div data-testid="vaccination-rabies-warning">
              • Rabies vaccination required (valid for 12 months)
            </div>
          )}
          {!isDhppValid && (
            <div data-testid="vaccination-dhpp-warning">
              • DHPP vaccination required (valid for 12 months)
            </div>
          )}
          {!isBordetellaValid && (
            <div data-testid="vaccination-bordetella-warning">
              • Bordetella vaccination required (valid for 6 months)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
