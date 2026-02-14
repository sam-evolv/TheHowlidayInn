import { Component, type ErrorInfo, type ReactNode } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth/AuthProvider";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import ScrollToTop from "@/components/ScrollToTop";
import RouteNavTheme from "@/components/RouteNavTheme";

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean; error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: '2rem', fontFamily: 'sans-serif'}}>
          <h2 style={{color: '#b91c1c'}}>Something went wrong</h2>
          <pre style={{whiteSpace: 'pre-wrap', background: '#fef2f2', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.875rem'}}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{marginTop: '1rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer'}}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import Home from "@/pages/home";
import Services from "@/pages/services";
import About from "@/pages/about";
import Daycare from "@/pages/daycare";
import Boarding from "@/pages/boarding";
import Trial from "@/pages/trial";
import LoginPage from "@/pages/login";
import AddDogPage from "@/pages/add-dog";
import Account from "@/pages/account";
import DogWizard from "@/pages/DogWizard";
import MyAccount from "@/pages/MyAccount";
import SuccessPage from "@/pages/success";
import CancelPage from "@/pages/cancel";
import CheckoutSuccessPage from "@/pages/checkout/Success";
import CheckoutCancelPage from "@/pages/checkout/Cancel";
import AdminPage from "@/pages/admin";
import AdminLoginPage from "@/pages/admin-login";
import OnboardingPage from "@/pages/onboarding";
import ProfilePage from "@/pages/profile";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/services" component={Services} />
      <Route path="/about" component={About} />
      <Route path="/daycare" component={Daycare} />
      <Route path="/boarding" component={Boarding} />
      <Route path="/trial" component={Trial} />
      <Route path="/dashboard">
        {() => { window.location.href = '/admin'; return null; }}
      </Route>
      <Route path="/login" component={LoginPage} />
      <Route path="/add-dog" component={DogWizard} />
      <Route path="/register-dog" component={DogWizard} />
      <Route path="/account" component={MyAccount} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/success" component={SuccessPage} />
      <Route path="/cancel" component={CancelPage} />
      <Route path="/checkout/success" component={CheckoutSuccessPage} />
      <Route path="/checkout/cancel" component={CheckoutCancelPage} />
      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <div className="min-h-screen flex flex-col bg-background bg-premium">
              <Header />
              <RouteNavTheme />
              <ScrollToTop />
              <main className="flex-1">
                <Router />
              </main>
              <Footer />
            </div>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
