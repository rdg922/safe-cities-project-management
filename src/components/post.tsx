"use client";

import { useState } from "react";
import { SendIcon } from "lucide-react";

import { api } from "~/trpc/react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";

export function LatestPost() {
  const [latestPost] = api.post.getLatest.useSuspenseQuery();

  const utils = api.useUtils();
  const [name, setName] = useState("");
  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      await utils.post.invalidate();
      setName("");
    },
  });

  return (
    <div className="w-full">
      {latestPost ? (
        <p className="text-sm mb-2 text-muted-foreground">Your most recent post: <span className="font-medium text-foreground">{latestPost.name}</span></p>
      ) : (
        <p className="text-sm mb-2 text-muted-foreground">You have no posts yet.</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createPost.mutate({ name });
        }}
        className="space-y-3"
      >
        <div className="space-y-2">
          <Label htmlFor="post-title">New Post</Label>
          <div className="flex gap-2">
            <Input
              id="post-title"
              type="text"
              placeholder="Enter post title"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1"
            />
            <Button 
              type="submit"
              disabled={createPost.isPending || name.trim() === ""}
              className="shrink-0"
            >
              {createPost.isPending ? "Submitting..." : "Submit"}
              {!createPost.isPending && <SendIcon className="ml-1 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
