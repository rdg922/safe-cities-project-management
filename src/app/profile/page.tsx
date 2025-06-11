"use client"

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { api } from "~/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { useToast } from "~/hooks/use-toast";
import { Edit2, Save, X } from "lucide-react";

export default function ProfilePage() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { toast } = useToast();
  
  // Get user profile from our database
  const { data: userProfile, isLoading, refetch } = api.user.getProfile.useQuery();
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  
  // Update profile mutation
  const updateProfileMutation = api.user.updateUserProfile.useMutation({
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
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

  const handleEditClick = () => {
    const profileName = userProfile && 'name' in userProfile ? userProfile.name : '';
    setEditedName(profileName || user?.fullName || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editedName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a valid name.",
        variant: "destructive",
      });
      return;
    }

    await updateProfileMutation.mutateAsync({
      name: editedName.trim(),
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedName("");
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and profile information
        </p>
      </div>

      <div className="space-y-6">
        {/* Main Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and account details
                </CardDescription>
              </div>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={handleEditClick}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar and Name Section */}
            <div className="flex items-start gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.imageUrl} alt={(userProfile && 'name' in userProfile ? userProfile.name : '') || user?.fullName || "User"} />
                <AvatarFallback className="text-lg">
                  {((userProfile && 'name' in userProfile ? userProfile.name : '') || user?.fullName || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        placeholder="Enter your full name"
                        className="max-w-md"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSave}
                        disabled={updateProfileMutation.isPending}
                        size="sm"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleCancel}
                        disabled={updateProfileMutation.isPending}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {(userProfile && 'name' in userProfile ? userProfile.name : '') || user?.fullName || "No name set"}
                      </h3>
                      <p className="text-muted-foreground">
                        {user?.primaryEmailAddress?.emailAddress}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={(userProfile && 'role' in userProfile && userProfile.role === 'admin') ? 'default' : 'secondary'}>
                        {(userProfile && 'role' in userProfile ? userProfile.role : null) || 'unverified'}
                      </Badge>
                      {user?.primaryEmailAddress?.verification?.status === "verified" && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          ✓ Email Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Account Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Account Details</h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">User ID</Label>
                    <p className="text-sm font-mono mt-1">{user?.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Email Address</Label>
                    <p className="text-sm mt-1">{user?.primaryEmailAddress?.emailAddress}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Account Role</Label>
                    <p className="text-sm mt-1 capitalize">{(userProfile && 'role' in userProfile ? userProfile.role : null) || 'unverified'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Account Statistics</h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">Member Since</Label>
                    <p className="text-sm mt-1">
                      {userProfile?.createdAt 
                        ? userProfile.createdAt.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : user?.createdAt 
                        ? new Date(user.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : 'Unknown'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Last Updated</Label>
                    <p className="text-sm mt-1">
                      {userProfile?.updatedAt 
                        ? userProfile.updatedAt.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : 'Never'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Profile Status</Label>
                    <p className="text-sm mt-1">
                      {userProfile ? (
                        <span className="text-green-600">✓ Synchronized</span>
                      ) : (
                        <span className="text-yellow-600">⚠ Not synchronized</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
