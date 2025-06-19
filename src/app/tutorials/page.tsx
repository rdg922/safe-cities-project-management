'use client'
import React from 'react';
import { useSidebar, SidebarTrigger } from '~/components/ui/sidebar';
import { useMobile } from '~/hooks/use-mobile';

const tutorials = [
  {
    id: '1',
    title: 'Getting Started',
    description: 'A quick overview of the platform.',
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    id: '2',
    title: 'How to Collaborate',
    description: 'Learn how to work with your team.',
    url: 'https://www.youtube.com/embed/9bZkp7q19f0',
  },
  {
    id: '3',
    title: 'Managing Files',
    description: 'Tips for organizing and managing your files efficiently.',
    url: 'https://www.youtube.com/embed/3JZ_D3ELwOQ',
  },
  {
    id: '4',
    title: 'Advanced Features',
    description: 'Discover advanced features to boost your productivity.',
    url: 'https://www.youtube.com/embed/L_jWHffIx5E',
  },
];

export default function TutorialsPage() {

    const { state } = useSidebar();
    const isMobile = useMobile();

  return (
    <div className="p-6 w-full">
      <div className="flex items-center gap-4 mb-4">
        {(state === 'collapsed' || isMobile) && <SidebarTrigger />}
        <h1 className="text-3xl font-bold">Tutorial Videos</h1>
      </div>
      <p className="mb-8 text-muted-foreground">Learn how to use the platform with these short videos.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {tutorials.map((video) => (
          <div key={video.id} className="border rounded-lg p-4 shadow-sm">
            <h2 className="text-xl font-semibold mb-2">{video.title}</h2>
            <p className="mb-4 text-muted-foreground">{video.description}</p>
            <div className="aspect-video w-full rounded overflow-hidden">
              <iframe
                width="100%"
                height="315"
                src={video.url}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 