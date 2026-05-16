'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Leaf, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';

const schema = z.object({ email: z.string().email('Invalid email') });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    try {
      await apiClient.post('/auth/forgot-password', data);
      setSent(true);
    } catch {
      toast({ title: 'Something went wrong', variant: 'destructive' });
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl border-0">
      <CardHeader className="space-y-1 text-center pb-2">
        <div className="flex justify-center mb-2">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Leaf className="w-5 h-5 text-primary-foreground" />
          </div>
        </div>
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>Enter your email and we'll send a reset link</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="font-medium">Check your inbox</p>
            <p className="text-sm text-muted-foreground">If that email is registered, you'll receive a reset link shortly.</p>
            <Button variant="outline" className="mt-2" asChild>
              <Link href="/login"><ArrowLeft className="mr-2 w-4 h-4" /> Back to Sign In</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="you@company.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Link
            </Button>
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/login"><ArrowLeft className="mr-2 w-4 h-4" /> Back to Sign In</Link>
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
