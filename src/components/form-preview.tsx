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
import { CalendarIcon, Upload } from 'lucide-react'
import { Calendar } from '~/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '~/components/ui/popover'
import { format } from 'date-fns'
import { cn } from '~/lib/utils'

interface FormPreviewProps {
    form: {
        id: number
        title: string
        description: string | null
        showProgressBar: boolean
        fields: Array<{
            id: number
            label: string
            description: string | null
            type: string
            required: boolean
            order: number
            options: any
            validation: any
            placeholder: string | null
            defaultValue: string | null
        }>
    }
}

export function FormPreview({ form }: FormPreviewProps) {
    const [formData, setFormData] = useState<Record<number, any>>({})
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

    const handleFieldChange = (fieldId: number, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [fieldId]: value,
        }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        // Validate required fields
        const missingFields = form.fields.filter(
            (field) =>
                field.required &&
                (!formData[field.id] || formData[field.id] === '')
        )

        if (missingFields.length > 0) {
            toast({
                title: 'Please fill in all required fields',
                description: `Missing: ${missingFields.map((f) => f.label).join(', ')}`,
                variant: 'destructive',
            })
            setIsSubmitting(false)
            return
        }

        // Prepare submission data
        const responses = form.fields.map((field) => ({
            fieldId: field.id,
            value: formData[field.id] || null,
        }))

        submitFormMutation.mutate({
            formId: form.id,
            responses,
            submitterName: submitterName || undefined,
            submitterEmail: submitterEmail || undefined,
        })
    }

    const renderField = (field: any) => {
        const value = formData[field.id] || field.defaultValue || ''

        switch (field.type) {
            case 'text':
                return (
                    <Input
                        value={value}
                        onChange={(e) =>
                            handleFieldChange(field.id, e.target.value)
                        }
                        placeholder={field.placeholder || ''}
                        required={field.required}
                    />
                )

            case 'email':
                return (
                    <Input
                        type="email"
                        value={value}
                        onChange={(e) =>
                            handleFieldChange(field.id, e.target.value)
                        }
                        placeholder={field.placeholder || 'Enter your email'}
                        required={field.required}
                    />
                )

            case 'number':
                return (
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) =>
                            handleFieldChange(field.id, e.target.value)
                        }
                        placeholder={field.placeholder || ''}
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
                                {value
                                    ? format(new Date(value), 'PPP')
                                    : field.placeholder || 'Pick a date'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={value ? new Date(value) : undefined}
                                onSelect={(date) =>
                                    handleFieldChange(
                                        field.id,
                                        date?.toISOString()
                                    )
                                }
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                )

            case 'textarea':
                return (
                    <Textarea
                        value={value}
                        onChange={(e) =>
                            handleFieldChange(field.id, e.target.value)
                        }
                        placeholder={field.placeholder || ''}
                        required={field.required}
                        rows={4}
                    />
                )

            case 'select':
                return (
                    <Select
                        value={value}
                        onValueChange={(val) =>
                            handleFieldChange(field.id, val)
                        }
                        required={field.required}
                    >
                        <SelectTrigger>
                            <SelectValue
                                placeholder={
                                    field.placeholder || 'Select an option'
                                }
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {field.options?.map((option: any) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )

            case 'multiselect':
                const multiValues = Array.isArray(value) ? value : []
                return (
                    <div className="space-y-2">
                        {field.options?.map((option: any) => (
                            <div
                                key={option.value}
                                className="flex items-center space-x-2"
                            >
                                <Checkbox
                                    id={`${field.id}-${option.value}`}
                                    checked={multiValues.includes(option.value)}
                                    onCheckedChange={(checked) => {
                                        const newValues = checked
                                            ? [...multiValues, option.value]
                                            : multiValues.filter(
                                                  (v: string) =>
                                                      v !== option.value
                                              )
                                        handleFieldChange(field.id, newValues)
                                    }}
                                />
                                <Label htmlFor={`${field.id}-${option.value}`}>
                                    {option.label}
                                </Label>
                            </div>
                        ))}
                    </div>
                )

            case 'radio':
                return (
                    <RadioGroup
                        value={value}
                        onValueChange={(val) =>
                            handleFieldChange(field.id, val)
                        }
                        required={field.required}
                    >
                        {field.options?.map((option: any) => (
                            <div
                                key={option.value}
                                className="flex items-center space-x-2"
                            >
                                <RadioGroupItem
                                    value={option.value}
                                    id={`${field.id}-${option.value}`}
                                />
                                <Label htmlFor={`${field.id}-${option.value}`}>
                                    {option.label}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                )

            case 'checkbox':
                const checkboxValues = Array.isArray(value) ? value : []
                return (
                    <div className="space-y-2">
                        {field.options?.map((option: any) => (
                            <div
                                key={option.value}
                                className="flex items-center space-x-2"
                            >
                                <Checkbox
                                    id={`${field.id}-${option.value}`}
                                    checked={checkboxValues.includes(
                                        option.value
                                    )}
                                    onCheckedChange={(checked) => {
                                        const newValues = checked
                                            ? [...checkboxValues, option.value]
                                            : checkboxValues.filter(
                                                  (v: string) =>
                                                      v !== option.value
                                              )
                                        handleFieldChange(field.id, newValues)
                                    }}
                                />
                                <Label htmlFor={`${field.id}-${option.value}`}>
                                    {option.label}
                                </Label>
                            </div>
                        ))}
                    </div>
                )

            case 'file':
                return (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
                        <div className="mt-4">
                            <Label
                                htmlFor={`file-${field.id}`}
                                className="cursor-pointer"
                            >
                                <span className="text-sm font-medium text-primary hover:text-primary/80">
                                    Upload a file
                                </span>
                                <Input
                                    id={`file-${field.id}`}
                                    type="file"
                                    className="sr-only"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            handleFieldChange(
                                                field.id,
                                                file.name
                                            )
                                        }
                                    }}
                                />
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                                {field.placeholder ||
                                    'Click to upload or drag and drop'}
                            </p>
                        </div>
                        {value && (
                            <Badge variant="secondary" className="mt-2">
                                {value}
                            </Badge>
                        )}
                    </div>
                )

            default:
                return (
                    <div className="text-muted-foreground text-sm">
                        Unsupported field type: {field.type}
                    </div>
                )
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
