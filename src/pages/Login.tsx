import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Stethoscope, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10 flex flex-col justify-center p-12 text-primary-foreground">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <Stethoscope className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">NurseLMS</h1>
              <p className="text-primary-foreground/80">Learning Management System</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              Empowering Nurses<br />Through Excellence<br />in Education
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-md">
              A comprehensive platform designed for healthcare institutions to manage training, 
              compliance, certifications, and professional development for nursing staff.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-6">
            <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-3xl font-bold">500+</p>
              <p className="text-sm text-primary-foreground/80">Training Modules</p>
            </div>
            <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-3xl font-bold">50k+</p>
              <p className="text-sm text-primary-foreground/80">Nurses Trained</p>
            </div>
            <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-3xl font-bold">98%</p>
              <p className="text-sm text-primary-foreground/80">Compliance Rate</p>
            </div>
            <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-3xl font-bold">200+</p>
              <p className="text-sm text-primary-foreground/80">Partner Hospitals</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Stethoscope className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">NurseLMS</h1>
            </div>
          </div>

          <div className="text-center lg:text-left mb-8">
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-muted-foreground mt-2">Sign in to access your learning dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-input" />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <a href="#" className="text-primary hover:underline font-medium">
                Forgot password?
              </a>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm font-medium text-foreground mb-3">Demo Credentials</p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Nurse:</span>
                <span className="font-mono">nurse@hospital.com / nurse123</span>
              </div>
              <div className="flex justify-between">
                <span>Admin:</span>
                <span className="font-mono">admin@hospital.com / admin123</span>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            © 2024 NurseLMS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
