'use client'

import { useState } from 'react'
import { toast } from '~/hooks/use-toast'
import { api } from '~/trpc/react'
import { Button } from '~/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Checkbox } from '~/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '~/components/ui/select'
import { Progress } from '~/components/ui/progress'
import { Badge } from '~/components/ui/badge'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '~/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '~/components/ui/popover'
import { format } from 'date-fns'
import { cn } from '~/lib/utils'

interface FormField {
    id: number
    label: string
    description: string | null
    type: string
    required: boolean
    order: number
    options: Array<{ text: string }>
    validation: Record<string, unknown>
    placeholder: string | null
    defaultValue: string | null
}

interface FormPreviewProps {
    form: {
        id: number
        title: string
        description: string | null
        showProgressBar: boolean
        fields: FormField[]
    }
}

export function FormPreview({ form }: FormPreviewProps) {
    const [formData, setFormData] = useState<Record<number, string | string[]>>({})
    const [currentStep, setCurrentStep] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)

    // For anonymous submissions
    const [submitterName, setSubmitterName] = useState('')
    const [submitterEmail, setSubmitterEmail] = useState('')

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

        try {
            await submitFormMutation.mutateAsync({
                formId: form.id,
                submitterName: submitterName || undefined,
                submitterEmail: submitterEmail || undefined,
                responses: Object.entries(formData).map(([fieldId, value]) => ({
                    fieldId: Number(fieldId),
                    value,
                })),
            })
        } catch (error) {
            // Error is handled by the mutation
        }
    }

    const renderField = (field: FormField) => {
        const value = formData[field.id] ?? ''

        switch (field.type) {
            case 'text':
            case 'email':
            case 'number':
                return (
                    <Input
                        type={field.type}
                        value={value as string}
                        onChange={(e) =>
                            handleFieldChange(field.id, e.target.value)
                        }
                        placeholder={field.placeholder ?? ''}
                        required={field.required}
                    />
                )

            case 'textarea':
                return (
                    <Textarea
                        value={value as string}
                        onChange={(e) =>
                            handleFieldChange(field.id, e.target.value)
                        }
                        placeholder={field.placeholder ?? ''}
                        required={field.required}
                    />
                )

            case 'date':
                return (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    'w-full justify-start text-left font-normal',
                                    !value && 'text-muted-foreground'
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {value ? (
                                    format(new Date(value as string), 'PPP')
                                ) : (
                                    <span>Pick a date</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={value ? new Date(value as string) : undefined}
                                onSelect={(date) =>
                                    handleFieldChange(
                                        field.id,
                                        date?.toISOString() ?? ''
                                    )
                                }
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                )

            case 'select':
                return (
                    <Select
                        value={value as string}
                        onValueChange={(val) => handleFieldChange(field.id, val)}
                        required={field.required}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={field.placeholder ?? 'Select an option'} />
                        </SelectTrigger>
                        <SelectContent>
                            {field.options?.map((option) => (
                                <SelectItem key={option.text} value={option.text}>
                                    {option.text}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )

            default:
                return null
        }
    }

    if (isSubmitted) {
        return (
            <Card className="max-w-2xl mx-auto">
                <CardContent className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                            className="w-8 h-8 text-green-600"
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
                    <h2 className="text-2xl font-bold mb-2">Thank you!</h2>
                    <p className="text-muted-foreground">
                        Your response has been submitted successfully.
                    </p>
                </CardContent>
            </Card>
        )
    }

    const progressValue =
        form.showProgressBar && form.fields.length > 0
            ? (Object.keys(formData).length / form.fields.length) * 100
            : 0

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{form.title}</CardTitle>
                    {form.description && (
                        <CardDescription>{form.description}</CardDescription>
                    )}
                    {form.showProgressBar && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Progress</span>
                                <span>{Math.round(progressValue)}%</span>
                            </div>
                            <Progress
                                value={progressValue}
                                className="w-full"
                            />
                        </div>
                    )}
                </CardHeader>
            </Card>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Anonymous submission fields */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">
                            Contact Information (Optional)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="submitter-name">Name</Label>
                                <Input
                                    id="submitter-name"
                                    value={submitterName}
                                    onChange={(e) =>
                                        setSubmitterName(e.target.value)
                                    }
                                    placeholder="Your name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="submitter-email">Email</Label>
                                <Input
                                    id="submitter-email"
                                    type="email"
                                    value={submitterEmail}
                                    onChange={(e) =>
                                        setSubmitterEmail(e.target.value)
                                    }
                                    placeholder="your.email@example.com"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Form fields */}
                {form.fields.map((field) => (
                    <Card key={field.id}>
                        <CardContent className="pt-6">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Label
                                        htmlFor={`field-${field.id}`}
                                        className="text-base font-medium"
                                    >
                                        {field.label}
                                    </Label>
                                    {field.required && (
                                        <Badge
                                            variant="destructive"
                                            className="text-xs"
                                        >
                                            Required
                                        </Badge>
                                    )}
                                </div>
                                {field.description && (
                                    <p className="text-sm text-muted-foreground">
                                        {field.description}
                                    </p>
                                )}
                                <div className="space-y-2">
                                    {renderField(field)}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                <Card>
                    <CardContent className="pt-6">
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Form'}
                        </Button>
                    </CardContent>
                </Card>
            </form>
        </div>
    )
}
