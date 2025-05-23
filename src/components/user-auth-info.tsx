"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "~/components/ui/card";

export function UserAuthInfo() {
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");

  // Get protected user data
  const { data: protectedData, isLoading: isProtectedLoading } = api.user.getProtectedUserData.useQuery();
  
  // Get public data
  const { data: publicData, isLoading: isPublicLoading } = api.user.getPublicUsers.useQuery();
  
  // Update profile mutation
  const updateProfile = api.user.updateUserProfile.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      // You would typically invalidate the query cache here to refresh data
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      name,
      title,
    });
  };

  return (
    <div className="space-y-6">
      {/* Authentication Status */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication Status</CardTitle>
          <CardDescription>Your current authentication status with Clerk and tRPC</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <strong>Clerk Auth Status:</strong> {user ? "Authenticated" : "Not Authenticated"}
            </div>
            {user && (
              <div>
                <strong>User ID:</strong> {user.id}
              </div>
            )}
            <div>
              <strong>tRPC Protected Status:</strong>{" "}
              {isProtectedLoading ? "Loading..." : protectedData ? "Access Granted" : "No Access"}
            </div>
            {protectedData && (
              <div>
                <strong>tRPC User ID:</strong> {protectedData.userId}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Public Data */}
      <Card>
        <CardHeader>
          <CardTitle>Public Data (No Auth Required)</CardTitle>
        </CardHeader>
        <CardContent>
          {isPublicLoading ? (
            <div>Loading public data...</div>
          ) : (
            <div>
              <p>{publicData?.message}</p>
              <ul className="list-disc pl-5 mt-2">
                {publicData?.users.map((user) => (
                  <li key={user.id}>
                    {user.name} (ID: {user.id})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Profile */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Update Profile</CardTitle>
            <CardDescription>Protected action requiring authentication</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded border p-2"
                    placeholder="Your name"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="title" className="text-sm font-medium">
                    Title
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="rounded border p-2"
                    placeholder="Your title"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? "Updating..." : "Save"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
            )}
          </CardContent>
          {updateProfile.isSuccess && (
            <CardFooter className="text-sm text-green-600">Profile updated successfully!</CardFooter>
          )}
        </Card>
      )}
    </div>
  );
}
