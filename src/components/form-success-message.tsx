'use client'

import { Card, CardContent } from '~/components/ui/card'

interface FormSuccessMessageProps {
    title?: string
    message?: string
}

export function FormSuccessMessage({
    title = 'Thank you!',
    message = 'Your response has been submitted successfully.',
}: FormSuccessMessageProps) {
    return (
        <Card className="max-w-2xl mx-auto">
            <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-green-900">
                    <svg
                        className="w-8 h-8 text-green-600 dark:text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">{title}</h2>
                <p className="text-muted-foreground">{message}</p>
            </CardContent>
        </Card>
    )
}
