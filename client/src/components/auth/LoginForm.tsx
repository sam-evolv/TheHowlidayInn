import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from './AuthProvider';
import { PawPrint, Loader2, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
const logoImage = "/brand/howliday-logo-light.png";

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onToggleMode: () => void;
  isLogin: boolean;
}

export default function LoginForm({ onToggleMode, isLogin }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { signIn, signUp, sendPasswordReset } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const checkUserProfileAndRedirect = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setLocation('/profile');
      } else {
        setLocation('/onboarding');
      }
    } catch (error) {
      console.error('Error checking user profile:', error);
      setLocation('/onboarding');
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      if (isForgotPassword) {
        await sendPasswordReset(data.email);
        toast({
          title: "Password Reset Email Sent! 📧",
          description: "Check your email for instructions to reset your password.",
        });
        setIsForgotPassword(false);
        setIsLoading(false);
        return;
      }

      if (!isForgotPassword && (!data.password || data.password.length < 6)) {
        form.setError('password', {
          type: 'manual',
          message: 'Password must be at least 6 characters',
        });
        setIsLoading(false);
        return;
      }

      if (isLogin) {
        await signIn(data.email, data.password!);
        toast({
          title: "Welcome back! 🐾",
          description: "You're now signed in. Your furry friend will be so happy!",
        });
        // Small delay to allow auth state to update before redirect
        setTimeout(async () => {
          const currentUser = (await import('@/lib/firebase')).auth.currentUser;
          if (currentUser) {
            await checkUserProfileAndRedirect(currentUser.uid);
          }
        }, 500);
      } else {
        await signUp(data.email, data.password!, "Guest User", "");
        toast({
          title: "Welcome to The Howliday Inn! 🎉",
          description: "Your account has been created. Let's get started with your profile!",
        });
        // Small delay to allow auth state to update before redirect
        setTimeout(() => {
          setLocation('/onboarding');
        }, 500);
      }
    } catch (error: any) {
      setIsLoading(false);
      toast({
        title: "Authentication Error",
        description: error.message || "Please try again or contact our friendly team for help.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 page-content page-enter" style={{ background: 'var(--hi-cream)' }}>
      <Card className="w-full max-w-md shadow-xl" style={{ background: 'white', border: '1px solid var(--hi-border)' }}>
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <img 
              src={logoImage} 
              alt="The Howliday Inn Logo" 
              className="h-20 w-auto object-contain"
            />
          </div>
          
          <div>
            <CardTitle className="text-xl">
              {isForgotPassword ? 'Reset Password' : isLogin ? 'Welcome Back!' : 'Join Our Pack!'}
            </CardTitle>
            <CardDescription className="flex items-center justify-center space-x-1 mt-2">
              <Heart className="h-4 w-4" style={{ color: 'var(--hi-rose)' }} />
              <span>
                {isForgotPassword 
                  ? 'Enter your email to receive reset instructions'
                  : 'Because your best friend deserves the best care'
                }
              </span>
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="your@email.com"
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isForgotPassword && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button 
                type="submit" 
                className="w-full btn-primary"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isForgotPassword ? 'Send Reset Email' : isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          {!isForgotPassword ? (
            <>
              <p className="text-sm text-muted-foreground text-center">
                {isLogin ? "New to The Howliday Inn?" : "Already have an account?"}
                <Button 
                  variant="link" 
                  onClick={onToggleMode}
                  className="p-0 ml-1 text-primary hover:text-primary/80 font-medium"
                >
                  {isLogin ? 'Join our pack!' : 'Sign in here'}
                </Button>
              </p>
              {isLogin && (
                <p className="text-sm text-muted-foreground text-center">
                  Forgot your password?
                  <Button 
                    variant="link" 
                    onClick={() => setIsForgotPassword(true)}
                    className="p-0 ml-1 text-primary hover:text-primary/80 font-medium"
                  >
                    Reset it here
                  </Button>
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              Remember your password?
              <Button 
                variant="link" 
                onClick={() => setIsForgotPassword(false)}
                className="p-0 ml-1 text-primary hover:text-primary/80 font-medium"
              >
                Back to sign in
              </Button>
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}