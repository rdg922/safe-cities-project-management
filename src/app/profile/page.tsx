"use client"

import { useUser } from "@clerk/nextjs";
import { api } from "~/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";

export default function ProfilePage() {
  const { user, isSignedIn, isLoaded } = useUser();
  
  // Get user profile from our database
  const { data: userProfile, isLoading } = api.user.getProfile.useQuery();
  
  if (!isLoaded || isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              You need to sign in to view your profile.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">
          View and manage your profile information
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>
              Basic information about your account
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
                <AvatarFallback>
                  {user?.firstName?.charAt(0)}
                  {user?.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">{user?.fullName}</h3>
                <p className="text-sm text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">User ID</p>
                <p className="text-sm font-mono">{user?.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email Address</p>
                <p className="text-sm">{user?.primaryEmailAddress?.emailAddress}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {user?.primaryEmailAddress?.verification?.status === "verified" 
                    ? "✓ Email verified" 
                    : "⚠️ Email not verified"}
                </p>
              </div>
              {user?.createdAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Joined</p>
                  <p className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Database Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Database Profile</CardTitle>
            <CardDescription>Your information in our database</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {userProfile ? (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Database ID</p>
                  <p className="text-sm font-mono">{userProfile.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email in Database</p>
                  <p className="text-sm">{userProfile.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created At</p>
                  <p className="text-sm">{userProfile.createdAt.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                  <p className="text-sm">{userProfile.updatedAt.toLocaleDateString()}</p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">Your profile hasn't been synchronized with our database yet.</p>
                <Button className="mt-4">Sync Profile</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
