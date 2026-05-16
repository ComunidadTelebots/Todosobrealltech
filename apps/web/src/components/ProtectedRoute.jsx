import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, currentUser, initialLoading } = useAuth();

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(currentUser?.role)) {
      return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
          <div className="max-w-md text-center space-y-6">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="w-10 h-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
              <p className="text-muted-foreground">
                You don't have the required permissions to view this page. This area is restricted.
              </p>
            </div>
            <Button asChild size="lg">
              <Link to="/dashboard">Return to Dashboard</Link>
            </Button>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;