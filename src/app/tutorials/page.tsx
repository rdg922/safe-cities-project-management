'use client'
import React from 'react';
import { useSidebar, SidebarTrigger } from '~/components/ui/sidebar';
import { useMobile } from '~/hooks/use-mobile';

const tutorials = [
  {
    id: '1',
    title: 'How to use the Users Tab (Admin)',
    description: 'A quick guide on managing users in the admin panel.',
    url: 'https://www.youtube.com/embed/IOphHXF4Ye8?si=CMypY5cTeLIW52JP',
  },
  {
    id: '2',
    title: 'How to Assign Permissions for Users (Admin)',
    description: 'Learn how to assign permissions to users effectively.',
    url: 'https://www.youtube.com/embed/vrFepzT1BZ4?si=nDAkZGbm9BoRGb2O',
  },
  {
    id: '3',
    title: 'How to create programs and pages',
    description: 'Step-by-step guide to creating programs and pages in the platform.',
    url: 'https://www.youtube.com/embed/k9IzdB8-NRI?si=BMo5dNwqQyRps_kT',
  },
  {
    id: '4',
    title: 'How to use forms',
    description: 'A comprehensive guide on using forms within the platform.',
    url: 'https://www.youtube.com/embed/5zQfg6RrMBI?si=PvFsSTS5n3qSZSjO',
  },
    {
    id: '5',
    title: 'How to use pages',
    description: 'A detailed tutorial on navigating and utilizing pages effectively.',
    url: 'https://www.youtube.com/embed/tm2cFtIpj-Y?si=CiID5GgnVLFHTN7C',
  },
    {
    id: '6',
    title: 'How to use chats',
    description: 'An introduction to using the chat feature for communication.',
    url: 'https://www.youtube.com/embed/frxgid2qgEY?si=54p40cYt2ChAZlOs',
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