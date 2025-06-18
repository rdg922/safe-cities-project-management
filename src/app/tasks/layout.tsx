import { type Metadata } from 'next'

export const metadata: Metadata = {
    title: 'My Tasks | Safe Cities Project Management',
    description: 'View and manage your assigned tasks in a calendar view',
}

export default function TasksLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
