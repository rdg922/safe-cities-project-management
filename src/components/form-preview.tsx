'use client'

import { useState } from 'react'
import { toast } from '~/hooks/use-toast'
import { api } from '~/trpc/react'
import { FormRenderer, type FormData } from '~/components/form-renderer'
import { FormSuccessMessage } from '~/components/form-success-message'

interface FormPreviewProps {
    form: FormData
}

export function FormPreview({ form }: FormPreviewProps) {
    const [formData, setFormData] = useState<Record<number, string | string[]>>(
        {}
    )
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)

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
        setIsSubmitting(true)

        // Extract name and email from form fields
        const nameField = form.fields.find(
            (f) => f.label.toLowerCase() === 'name'
        )
        const emailField = form.fields.find((f) => f.type === 'email')

        const submitterName = nameField
            ? (formData[nameField.id] as string) || undefined
            : undefined
        const submitterEmail = emailField
            ? (formData[emailField.id] as string) || undefined
            : undefined

        try {
            await submitFormMutation.mutateAsync({
                formId: form.id,
                submitterName,
                submitterEmail,
                responses: Object.entries(formData).map(([fieldId, value]) => ({
                    fieldId: Number(fieldId),
                    value,
                })),
            })
        } catch (error) {
            // Error is handled by the mutation
        }
    }

    if (isSubmitted) {
        return <FormSuccessMessage />
    }

    return (
        <FormRenderer
            form={form}
            formData={formData}
            onFieldChange={handleFieldChange}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
        />
    )
}
