import Link from "next/link";
import { ExternalLink, Info, Server, Layers, Database, Code } from "lucide-react";

import { LatestPost } from "~/app/_components/post";
import { api, HydrateClient } from "~/trpc/server";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/app/_components/ui/card";
import { Button } from "~/app/_components/ui/button";
import { Separator } from "~/app/_components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/app/_components/ui/tabs";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });

  void api.post.getLatest.prefetch();

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
        <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16 max-w-5xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Safe Cities <span className="text-primary">Project Management</span>
          </h1>
          <p className="text-muted-foreground text-center max-w-2xl">
            Developer portal for the Safe Cities Project Management system. This page provides information about the tech stack and API functionality.
          </p>
          
          <Tabs defaultValue="api-demo" className="w-full max-w-3xl">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="api-demo">API Demo</TabsTrigger>
              <TabsTrigger value="tech-stack">Tech Stack</TabsTrigger>
            </TabsList>
            
            <TabsContent value="api-demo" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    tRPC API Demo
                  </CardTitle>
                  <CardDescription>
                    Example of type-safe API calls with tRPC
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Query Example</h3>
                    <div className="p-4 bg-muted rounded-md">
                      <p className="font-mono text-sm">api.post.hello({"{ text: \"from tRPC\" }"})</p>
                      <Separator className="my-2" />
                      <p className="text-sm">Response: {hello ? hello.greeting : "Loading..."}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      This demonstrates a simple query with input validation using Zod
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Mutation & Query Example</h3>
                    <div className="bg-card border rounded-md p-4">
                      <LatestPost />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      This component demonstrates creating and fetching posts using tRPC mutations and queries
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">How It Works</h3>
                    <p className="text-muted-foreground">
                      1. <strong>Server Routers:</strong> Define endpoints in <code>src/server/api/routers/</code>
                    </p>
                    <p className="text-muted-foreground">
                      2. <strong>Type Safety:</strong> Input validation with Zod schemas
                    </p>
                    <p className="text-muted-foreground">
                      3. <strong>Client Usage:</strong> Import from <code>~/trpc/react</code> for client components or <code>~/trpc/server</code> for server components
                    </p>
                    <p className="text-muted-foreground">
                      4. <strong>Data Fetching:</strong> Server components use <code>await api.procedure</code> while client components use hooks like <code>api.procedure.useQuery()</code>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tech-stack" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Tech Stack Overview
                  </CardTitle>
                  <CardDescription>
                    Key technologies powering this application
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Code className="h-4 w-4" /> Frontend Framework
                    </h3>
                    <p className="text-muted-foreground">
                      Next.js 15 with App Router and React 19 for server and client components
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Using the latest React Server Components for optimal performance and SEO
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Database className="h-4 w-4" /> Database
                    </h3>
                    <p className="text-muted-foreground">
                      SQLite with Drizzle ORM for type-safe database operations
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Schema defined in <code>src/server/db/schema.ts</code>
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Server className="h-4 w-4" /> API Layer
                    </h3>
                    <p className="text-muted-foreground">
                      tRPC for end-to-end typesafe API with automatic input validation via Zod
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Routes defined in <code>src/server/api/routers/</code>
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Info className="h-4 w-4" /> UI Components
                    </h3>
                    <p className="text-muted-foreground">
                      Shadcn UI for accessible, customizable components built on Radix UI primitives
                    </p>
                    <p className="text-sm text-muted-foreground">
                      TailwindCSS for utility-first styling with custom theme support
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" asChild>
                    <Link href="https://create.t3.gg/en/introduction" target="_blank">
                      T3 Stack Docs <ExternalLink className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="https://ui.shadcn.com/" target="_blank">
                      Shadcn UI <ExternalLink className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </HydrateClient>
  );
}
