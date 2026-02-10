// TODO HowlidayInn: 3-step dog registration wizard

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { FileInput } from "@/components/FileInput";
import { dogAboutInsertSchema, vaccinationUpsertSchema, healthProfileUpsertSchema, type DogAboutInsert, type VaccinationUpsert, type HealthProfileUpsert } from "@/../../shared/schema";
import { isBreedProhibited } from "@/lib/breeds";
import { COMMON_BREEDS } from "@/lib/constants";

// Step 1: Use shared backend schema (breed validation moved to submission logic)
const aboutSchema = dogAboutInsertSchema;

// Step 2: Simplified vaccination schema - just photo upload and optional notes
const simpleVaccinationSchema = z.object({
  vaccinationCardUrl: z.string().min(1, "Please upload your dog's vaccination card"),
  vaccinationNotes: z.string().optional(),
});

// Step 3: Use shared health profile schema with required consent fields
const healthSchema = healthProfileUpsertSchema.omit({
  accuracyConfirmation: true,
  emergencyTreatmentConsent: true,
}).extend({
  accuracyConfirmation: z.boolean().refine(val => val === true, "You must confirm accuracy"),
  emergencyTreatmentConsent: z.boolean().refine(val => val === true, "You must consent to emergency treatment"),
});

const STEPS = [
  { id: 1, title: "About Your Dog", description: "Basic information about your dog" },
  { id: 2, title: "Vaccinations", description: "Vaccination records and proof" },
  { id: 3, title: "Health & Contacts", description: "Health profile and emergency contacts" },
];

export default function DogWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [dogId, setDogId] = useState<string | null>(null);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form instances for each step
  const aboutForm = useForm({
    resolver: zodResolver(aboutSchema),
    defaultValues: loadFromStorage("dogWizard_step1"),
  });

  // Fetch vaccination requirements from settings
  const { data: settings } = useQuery({
    queryKey: ['/api/settings/public'],
  });

  const vaccinationsForm = useForm({
    resolver: zodResolver(simpleVaccinationSchema),
    defaultValues: loadFromStorage("dogWizard_step2") || {
      vaccinationCardUrl: "",
      vaccinationNotes: "",
    },
  });

  const healthForm = useForm({
    resolver: zodResolver(healthSchema),
    defaultValues: loadFromStorage("dogWizard_step3"),
  });

  // Upload configuration
  const { data: uploadConfig } = useQuery({
    queryKey: ['/api/uploads/config'],
    enabled: import.meta.env.VITE_UPLOADS_PROVIDER === 'cloudinary',
  });

  // Create dog mutation
  const createDogMutation = useMutation({
    mutationFn: async (data: z.infer<typeof aboutSchema>) => {
      // Check breed policy before submitting
      if (data.breed) {
        const prohibited = await isBreedProhibited(data.breed);
        if (prohibited) {
          throw new Error("We're sorry, but we cannot accommodate this breed at our facility. We'd be happy to recommend other excellent care providers in the area.");
        }
      }
      
      const { authenticatedFetch } = await import('@/lib/apiClient');
      const response = await authenticatedFetch('/api/me/dogs', {
        method: 'POST',
        body: JSON.stringify({ dog: data }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        console.error('Dog creation failed:', response.status, errorBody);
        throw new Error(errorBody.message || errorBody.error || 'Failed to create dog profile');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setDogId(data.id);
      setCurrentStep(2);
      toast({ title: "Success", description: "Dog profile created!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create dog profile", variant: "destructive" });
    },
  });

  // Save vaccinations mutation - simplified to just save the photo URL
  const saveVaccinationsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof simpleVaccinationSchema>) => {
      if (!dogId) throw new Error('No dog ID');
      const { authenticatedFetch } = await import('@/lib/apiClient');
      
      // Save the vaccination card photo to the dog's record
      const response = await authenticatedFetch(`/api/me/dogs/${dogId}/vaccination-card`, {
        method: 'POST',
        body: JSON.stringify({
          vaccinationCardUrl: data.vaccinationCardUrl,
          vaccinationNotes: data.vaccinationNotes || '',
        }),
      });
      if (!response.ok) throw new Error('Failed to save vaccination card');
      return response.json();
    },
    onSuccess: () => {
      setCurrentStep(3);
      toast({ title: "Success", description: "Vaccination card saved!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to save vaccination card", variant: "destructive" });
    },
  });

  // Save health profile mutation
  const saveHealthMutation = useMutation({
    mutationFn: async (data: z.infer<typeof healthSchema>) => {
      if (!dogId) throw new Error('No dog ID');
      const { authenticatedFetch } = await import('@/lib/apiClient');
      
      const response = await authenticatedFetch(`/api/me/dogs/${dogId}/health`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save health profile');
      return response.json();
    },
    onSuccess: () => {
      // Clear localStorage and invalidate cache
      clearWizardStorage();
      queryClient.invalidateQueries({ queryKey: ['/api/me/dogs'] });
      setLocation('/profile');
      toast({ title: "Success", description: "Dog registration completed!" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to save health profile", variant: "destructive" });
    },
  });

  const handleStepSubmit = (step: number, data: any) => {
    saveToStorage(`dogWizard_step${step}`, data);
    
    switch (step) {
      case 1:
        createDogMutation.mutate(data);
        break;
      case 2:
        saveVaccinationsMutation.mutate(data);
        break;
      case 3:
        saveHealthMutation.mutate(data);
        break;
    }
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  return (
    <div className="container mx-auto max-w-2xl pb-8 page-content" data-testid="dog-wizard">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Register Your Dog</h1>
        <p className="text-muted-foreground">Complete your dog's profile for booking eligibility</p>
        
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Step {currentStep} of {STEPS.length}</span>
            <span className="text-sm text-muted-foreground">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="w-full" />
        </div>
      </div>

      {currentStep === 1 && (
        <AboutDogStep 
          form={aboutForm} 
          onSubmit={(data) => handleStepSubmit(1, data)}
          isLoading={createDogMutation.isPending}
        />
      )}

      {currentStep === 2 && (
        <VaccinationsStep 
          form={vaccinationsForm}
          onSubmit={(data) => handleStepSubmit(2, data)}
          onBack={() => setCurrentStep(1)}
          isLoading={saveVaccinationsMutation.isPending}
        />
      )}

      {currentStep === 3 && (
        <HealthContactsStep 
          form={healthForm}
          onSubmit={(data) => handleStepSubmit(3, data)}
          onBack={() => setCurrentStep(2)}
          isLoading={saveHealthMutation.isPending}
        />
      )}
    </div>
  );
}

// Step Components
function AboutDogStep({ form, onSubmit, isLoading }: { 
  form: any; 
  onSubmit: (data: z.infer<typeof aboutSchema>) => void; 
  isLoading: boolean; 
}) {
  return (
    <Card data-testid="step-about">
      <CardHeader>
        <CardTitle>About Your Dog</CardTitle>
        <CardDescription>Tell us about your furry friend</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dog Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your dog's name" {...field} data-testid="input-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="breed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Breed</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Golden Retriever" list="breed-suggestions" {...field} data-testid="input-breed" />
                  </FormControl>
                  <datalist id="breed-suggestions">
                    {COMMON_BREEDS.map(breed => (
                      <option key={breed} value={breed} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sex</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-sex">
                        <SelectValue placeholder="Select sex" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-dob" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weightKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="25" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        data-testid="input-weight"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Golden, Brown, Black" {...field} data-testid="input-color" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="neuteredSpayed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-neutered"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Neutered/Spayed</FormLabel>
                    <FormDescription>Is your dog neutered or spayed?</FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dog Photo (Optional)</FormLabel>
                  <FormControl>
                    <FileInput 
                      value={field.value || ''}
                      onChange={(url) => field.onChange(url)}
                      label="Upload a photo of your dog (JPG/PNG)"
                      accept="image/jpeg,image/png,image/webp"
                    />
                  </FormControl>
                  <FormDescription>
                    Help us recognise your dog by uploading a recent photo
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              data-testid="button-next-step1"
            >
              {isLoading ? "Creating..." : "Next: Vaccinations"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

function VaccinationsStep({ form, onSubmit, onBack, isLoading }: { 
  form: any; 
  onSubmit: (data: z.infer<typeof simpleVaccinationSchema>) => void; 
  onBack: () => void; 
  isLoading: boolean; 
}) {
  return (
    <Card data-testid="step-vaccinations">
      <CardHeader>
        <CardTitle>Vaccination Card</CardTitle>
        <CardDescription>
          Upload a photo of your dog's vaccination card or record.
          <br />
          <span className="text-sm text-muted-foreground font-medium">
            All vaccinations including Kennel Cough must be up to date.
          </span>
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="vaccinationCardUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vaccination Card Photo</FormLabel>
                  <FormControl>
                    <FileInput
                      label="Upload vaccination card"
                      value={field.value || ''}
                      onChange={(url) => field.onChange(url)}
                      accept="image/jpeg,image/png,application/pdf"
                    />
                  </FormControl>
                  <FormDescription>
                    Upload a clear photo of your dog's vaccination card showing all current vaccinations (JPG, PNG, or PDF)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vaccinationNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional information about your dog's vaccinations..."
                      {...field} 
                      data-testid="textarea-vaccination-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={onBack} data-testid="button-back-step2">
              Back
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={isLoading}
              data-testid="button-next-step2"
            >
              {isLoading ? "Saving..." : "Next: Health & Contacts"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

function HealthContactsStep({ form, onSubmit, onBack, isLoading }: { 
  form: any; 
  onSubmit: (data: z.infer<typeof healthSchema>) => void; 
  onBack: () => void; 
  isLoading: boolean; 
}) {
  return (
    <Card data-testid="step-health">
      <CardHeader>
        <CardTitle>Health & Contacts</CardTitle>
        <CardDescription>Health information and emergency contacts</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Behavior & Health */}
            <div className="space-y-4">
              <h3 className="font-medium">Behavior & Health</h3>
              
              <FormField
                control={form.control}
                name="behaviourNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Behavior Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any behavioral notes, temperament, special requirements..."
                        {...field} 
                        data-testid="textarea-behavior"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="biteHistory"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-bite-history"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>History of biting</FormLabel>
                      <FormDescription>Has your dog ever bitten a person or animal?</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="conditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medical Conditions</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any medical conditions, chronic illnesses..."
                        {...field} 
                        data-testid="textarea-conditions"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allergies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allergies</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Food allergies, environmental allergies..."
                        {...field} 
                        data-testid="textarea-allergies"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Emergency Contacts */}
            <div className="space-y-4">
              <h3 className="font-medium">Emergency Contacts</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vetName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Veterinarian Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Dr. Smith" {...field} data-testid="input-vet-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vetPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vet Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+353 1 234 5678" {...field} data-testid="input-vet-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} data-testid="input-emergency-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+353 86 123 4567" {...field} data-testid="input-emergency-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Feeding & Medication */}
            <div className="space-y-4">
              <h3 className="font-medium">Feeding & Medication</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="feedingBrand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Food Brand</FormLabel>
                      <FormControl>
                        <Input placeholder="Royal Canin, Purina..." {...field} data-testid="input-food-brand" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="medicationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Medications</FormLabel>
                      <FormControl>
                        <Input placeholder="Medication name" {...field} data-testid="input-medication" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="feedingSchedule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feeding Schedule</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Times and amounts for feeding..."
                        {...field} 
                        data-testid="textarea-feeding"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Permissions */}
            <div className="space-y-4">
              <h3 className="font-medium">Permissions & Consent</h3>
              
              <FormField
                control={form.control}
                name="mediaPermission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Photo/Video Permission</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-media-permission">
                          <SelectValue placeholder="Select permission" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Yes">Yes, you may take photos/videos</SelectItem>
                        <SelectItem value="No">No photos/videos please</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accuracyConfirmation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-accuracy"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Accuracy Confirmation *</FormLabel>
                      <FormDescription>
                        I confirm that all information provided is accurate and up to date
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emergencyTreatmentConsent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-emergency-consent"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Emergency Treatment Consent *</FormLabel>
                      <FormDescription>
                        I consent to emergency veterinary treatment if needed
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>

          <CardFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={onBack} data-testid="button-back-step3">
              Back
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={isLoading}
              data-testid="button-submit-registration"
            >
              {isLoading ? "Completing..." : "Complete Registration"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

// Utility functions
function loadFromStorage(key: string) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : undefined;
  } catch {
    return undefined;
  }
}

function saveToStorage(key: string, data: any) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

function clearWizardStorage() {
  try {
    ['dogWizard_step1', 'dogWizard_step2', 'dogWizard_step3'].forEach(key => {
      localStorage.removeItem(key);
    });
  } catch {
    // Ignore storage errors
  }
}