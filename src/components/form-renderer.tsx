'use client'

import { useState } from 'react'
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

export interface FormField {
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

export interface FormData {
    id: number
    title: string
    description: string | null
    showProgressBar: boolean
    fields: FormField[]
}

interface FormRendererProps {
    form: FormData
    formData: Record<number, string | string[]>
    onFieldChange: (fieldId: number, value: string | string[]) => void
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
    isSubmitting: boolean
}

export function FormRenderer({
    form,
    formData,
    onFieldChange,
    onSubmit,
    isSubmitting,
}: FormRendererProps) {
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
                            onFieldChange(field.id, e.target.value)
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
                            onFieldChange(field.id, e.target.value)
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
                                selected={
                                    value
                                        ? new Date(value as string)
                                        : undefined
                                }
                                onSelect={(date) =>
                                    onFieldChange(
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
                        onValueChange={(val) => onFieldChange(field.id, val)}
                        required={field.required}
                    >
                        <SelectTrigger>
                            <SelectValue
                                placeholder={
                                    field.placeholder ?? 'Select an option'
                                }
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {field.options?.map((option) => (
                                <SelectItem
                                    key={option.text}
                                    value={option.text}
                                >
                                    {option.text}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )

            case 'checkbox':
                const checkboxValues = Array.isArray(value) ? value : []
                return (
                    <div className="space-y-2">
                        {field.options?.map((option) => (
                            <div
                                key={option.text}
                                className="flex items-center space-x-2"
                            >
                                <Checkbox
                                    id={`${field.id}-${option.text}`}
                                    checked={checkboxValues.includes(
                                        option.text
                                    )}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            onFieldChange(field.id, [
                                                ...checkboxValues,
                                                option.text,
                                            ])
                                        } else {
                                            onFieldChange(
                                                field.id,
                                                checkboxValues.filter(
                                                    (v) => v !== option.text
                                                )
                                            )
                                        }
                                    }}
                                />
                                <Label
                                    htmlFor={`${field.id}-${option.text}`}
                                    className="text-sm font-normal"
                                >
                                    {option.text}
                                </Label>
                            </div>
                        ))}
                    </div>
                )

            case 'radio':
                return (
                    <RadioGroup
                        value={value as string}
                        onValueChange={(val) => onFieldChange(field.id, val)}
                        required={field.required}
                    >
                        {field.options?.map((option) => (
                            <div
                                key={option.text}
                                className="flex items-center space-x-2"
                            >
                                <RadioGroupItem
                                    value={option.text}
                                    id={`${field.id}-${option.text}`}
                                />
                                <Label
                                    htmlFor={`${field.id}-${option.text}`}
                                    className="text-sm font-normal"
                                >
                                    {option.text}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                )

            default:
                return null
        }
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

            <form onSubmit={onSubmit} className="space-y-6">
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
