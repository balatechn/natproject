'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/index';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
type LoginForm = z.infer<typeof loginSchema>;

const mfaSchema = z.object({ code: z.string().length(6, 'Enter 6-digit code') });
type MfaForm = z.infer<typeof mfaSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const setUser = useAuthStore((s) => s.setUser);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const [showPassword, setShowPassword] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [tempEmail, setTempEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const {
    register: registerMfa,
    handleSubmit: handleMfaSubmit,
    formState: { errors: mfaErrors, isSubmitting: mfaSubmitting },
  } = useForm<MfaForm>({ resolver: zodResolver(mfaSchema) });

  const onLogin = async (data: LoginForm) => {
    try {
      const res = await apiClient.post('/auth/login', data);
      if (res.data.data?.mfaRequired) {
        setTempEmail(data.email);
        setMfaRequired(true);
        return;
      }
      const { accessToken, user } = res.data.data;
      setAccessToken(accessToken);
      setUser(user);
      router.push('/dashboard');
    } catch (err: any) {
      toast({
        title: 'Login failed',
        description: err.response?.data?.message ?? 'Invalid credentials',
        variant: 'destructive',
      });
    }
  };

  const onMfa = async (data: MfaForm) => {
    try {
      const res = await apiClient.post('/auth/login', { email: tempEmail, mfaCode: data.code });
      const { accessToken, user } = res.data.data;
      setAccessToken(accessToken);
      setUser(user);
      router.push('/dashboard');
    } catch {
      toast({ title: 'Invalid MFA code', variant: 'destructive' });
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl border-0">
      <CardHeader className="space-y-1 text-center pb-2">
        <div className="flex justify-center mb-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight">NAT Project</span>
          </div>
        </div>
        <CardTitle className="text-xl">{mfaRequired ? 'Two-Factor Authentication' : 'Welcome back'}</CardTitle>
        <CardDescription>
          {mfaRequired ? 'Enter the 6-digit code from your authenticator app' : 'Sign in to your workspace'}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        {!mfaRequired ? (
          <form onSubmit={handleSubmit(onLogin)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="admin@natproject.app" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        ) : (
          <form onSubmit={handleMfaSubmit(onMfa)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Authenticator Code</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="text-center text-2xl tracking-widest"
                {...registerMfa('code')}
              />
              {mfaErrors.code && <p className="text-xs text-destructive">{mfaErrors.code.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={mfaSubmitting}>
              {mfaSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify
            </Button>
            <Button variant="ghost" className="w-full" type="button" onClick={() => setMfaRequired(false)}>
              Back to login
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3 pt-0">
        <div className="relative w-full">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">New to NAT Project?</span>
          </div>
        </div>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/register">Create an account</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
