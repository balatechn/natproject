export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold text-primary">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <a href="/dashboard" className="text-primary underline underline-offset-4">
        Back to Dashboard
      </a>
    </div>
  );
}
