'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from '~/hooks/use-toast'
import { api } from '~/trpc/react'
import { FormRenderer, type FormData } from '~/components/form-renderer'
import { FormSuccessMessage } from '~/components/form-success-message'
import { Card, CardContent } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'

export default function FormSubmitPage() {
    const params = useParams()
    const formId = Number(params.formId)
    const [formData, setFormData] = useState<Record<number, string | string[]>>(
        {}
    )
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)

    const {
        data: form,
        isLoading,
        error,
    } = api.forms.getByFileId.useQuery(
        { fileId: formId },
        { enabled: !!formId && !isNaN(formId) }
    )

    const submitFormMutation = api.forms.submit.useMutation({
        onSuccess: () => {
            setIsSubmitted(true)
            toast({ title: 'Form submitted successfully!' })
        },
        onError: (error) => {
            toast({
                title: 'Error submitting form',
                description: error.message,
                variant: 'destructive',
            })
        },
        onSettled: () => {
            setIsSubmitting(false)
        },
    })

    const handleFieldChange = (fieldId: number, value: string | string[]) => {
        setFormData((prev) => ({
            ...prev,
            [fieldId]: value,
        }))
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!form) return

        // Check if form is accepting responses
        if (!form.acceptingResponses) {
            toast({
                title: 'Form not accepting responses',
                description: 'This form is currently closed for submissions.',
                variant: 'destructive',
            })
            return
        }

        setIsSubmitting(true)

        try {
            await submitFormMutation.mutateAsync({
                formId: form.fileId, // Use fileId instead of form.id
                responses: Object.entries(formData).map(([fieldId, value]) => ({
                    fieldId: Number(fieldId),
                    value,
                })),
            })
        } catch (error) {
            // Error is handled by the mutation
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Loading form...
                    </p>
                </div>
            </div>
        )
    }

    if (error || !form) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="max-w-md mx-auto">
                    <CardContent className="text-center py-12">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-red-900">
                            <svg
                                className="w-8 h-8 text-red-600 dark:text-red-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold mb-2 text-destructive">
                            Form Not Available
                        </h2>
                        <p className="text-muted-foreground">
                            {error?.message ||
                                'This form could not be found or is no longer available.'}
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Check if form is published
    if (!form.isPublished) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="max-w-md mx-auto">
                    <CardContent className="text-center py-12">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-yellow-900">
                            <svg
                                className="w-8 h-8 text-yellow-600 dark:text-yellow-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L9 9m.878.878l1.12 1.12M15 9l-1.12 1.12"
                                />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold mb-2">
                            Form Not Published
                        </h2>
                        <p className="text-muted-foreground">
                            This form is currently in draft mode and not
                            available for submissions.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Check if form is accepting responses
    if (!form.acceptingResponses) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="max-w-md mx-auto">
                    <CardContent className="text-center py-12">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-orange-900">
                            <svg
                                className="w-8 h-8 text-orange-600 dark:text-orange-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18 18M5.636 5.636L6 6"
                                />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold mb-2">Form Closed</h2>
                        <p className="text-muted-foreground">
                            This form is currently not accepting new
                            submissions.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-background py-12">
                <FormSuccessMessage />
            </div>
        )
    }

    const formProps: FormData = {
        id: form.fileId,
        title: form.title,
        description: form.description,
        showProgressBar: form.showProgressBar ?? false,
        fields: form.fields.map((field) => ({
            id: field.id,
            label: field.label,
            description: field.description,
            type: field.type,
            required: field.required ?? false,
            order: field.order ?? 0,
            options: field.options,
            validation: field.validation,
            placeholder: field.placeholder,
            defaultValue: field.defaultValue,
        })),
    }

    return (
        <div className="min-h-screen bg-background py-12">
            {/* Form Status Banner */}
            <div className="max-w-2xl mx-auto mb-6 px-4">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Badge
                        variant="default"
                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    >
                        <svg
                            className="w-3 h-3 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        Form Active
                    </Badge>
                </div>
            </div>

            <div className="px-4">
                <FormRenderer
                    form={formProps}
                    formData={formData}
                    onFieldChange={handleFieldChange}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                />
            </div>
        </div>
    )
}
