'use client'

import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { toast } from '~/hooks/use-toast'
import { api } from '~/trpc/react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Switch } from '~/components/ui/switch'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '~/components/ui/select'
import { Badge } from '~/components/ui/badge'
import { Separator } from '~/components/ui/separator'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '~/components/ui/dialog'
import {
    Plus,
    GripVertical,
    Trash2,
    Edit2,
    Type,
    Mail,
    Hash,
    Calendar,
    List,
    CheckSquare,
    Circle,
    Square,
    AlignLeft,
    Paperclip,
} from 'lucide-react'
import { FORM_FIELD_TYPES } from '~/server/db/schema'

interface FormBuilderProps {
    form: {
        id: number
        title: string
        description: string | null
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
    onUpdate: () => void
}

interface FieldOption {
    value: string
    label: string
}

const FIELD_TYPE_ICONS = {
    text: Type,
    email: Mail,
    number: Hash,
    date: Calendar,
    select: List,
    multiselect: List,
    radio: Circle,
    checkbox: CheckSquare,
    textarea: AlignLeft,
    file: Paperclip,
}

const FIELD_TYPE_LABELS = {
    text: 'Text',
    email: 'Email',
    number: 'Number',
    date: 'Date',
    select: 'Dropdown',
    multiselect: 'Multi-select',
    radio: 'Radio Buttons',
    checkbox: 'Checkboxes',
    textarea: 'Long Text',
    file: 'File Upload',
}

export function FormBuilder({ form, onUpdate }: FormBuilderProps) {
    const [isAddFieldDialogOpen, setIsAddFieldDialogOpen] = useState(false)
    const [editingField, setEditingField] = useState<any | null>(null)
    const [newFieldType, setNewFieldType] = useState<string>('text')

    // Field form state
    const [fieldForm, setFieldForm] = useState({
        label: '',
        description: '',
        type: 'text',
        required: false,
        placeholder: '',
        defaultValue: '',
        options: [] as FieldOption[],
        validation: {},
    })

    // Mutations
    const addFieldMutation = api.forms.addField.useMutation({
        onSuccess: () => {
            toast({ title: 'Field added successfully' })
            onUpdate()
            setIsAddFieldDialogOpen(false)
            resetFieldForm()
        },
        onError: (error) => {
            toast({
                title: 'Error adding field',
                description: error.message,
                variant: 'destructive',
            })
        },
    })

    const updateFieldMutation = api.forms.updateField.useMutation({
        onSuccess: () => {
            toast({ title: 'Field updated successfully' })
            onUpdate()
            setEditingField(null)
            resetFieldForm()
        },
        onError: (error) => {
            toast({
                title: 'Error updating field',
                description: error.message,
                variant: 'destructive',
            })
        },
    })

    const deleteFieldMutation = api.forms.deleteField.useMutation({
        onSuccess: () => {
            toast({ title: 'Field deleted successfully' })
            onUpdate()
        },
        onError: (error) => {
            toast({
                title: 'Error deleting field',
                description: error.message,
                variant: 'destructive',
            })
        },
    })

    const reorderFieldsMutation = api.forms.reorderFields.useMutation({
        onSuccess: () => {
            onUpdate()
        },
        onError: (error) => {
            toast({
                title: 'Error reordering fields',
                description: error.message,
                variant: 'destructive',
            })
        },
    })

    const resetFieldForm = () => {
        setFieldForm({
            label: '',
            description: '',
            type: 'text',
            required: false,
            placeholder: '',
            defaultValue: '',
            options: [],
            validation: {},
        })
    }

    const handleAddField = () => {
        if (!fieldForm.label.trim()) {
            toast({
                title: 'Field label is required',
                variant: 'destructive',
            })
            return
        }

        const fieldData = {
            formId: form.id,
            label: fieldForm.label,
            description: fieldForm.description || undefined,
            type: fieldForm.type as any,
            required: fieldForm.required,
            placeholder: fieldForm.placeholder || undefined,
            defaultValue: fieldForm.defaultValue || undefined,
            options: ['select', 'multiselect', 'radio', 'checkbox'].includes(
                fieldForm.type
            )
                ? fieldForm.options
                : undefined,
            validation:
                Object.keys(fieldForm.validation).length > 0
                    ? fieldForm.validation
                    : undefined,
        }

        addFieldMutation.mutate(fieldData)
    }

    const handleUpdateField = () => {
        if (!editingField || !fieldForm.label.trim()) return

        const fieldData = {
            fieldId: editingField.id,
            label: fieldForm.label,
            description: fieldForm.description || undefined,
            type: fieldForm.type as any,
            required: fieldForm.required,
            placeholder: fieldForm.placeholder || undefined,
            defaultValue: fieldForm.defaultValue || undefined,
            options: ['select', 'multiselect', 'radio', 'checkbox'].includes(
                fieldForm.type
            )
                ? fieldForm.options
                : undefined,
            validation:
                Object.keys(fieldForm.validation).length > 0
                    ? fieldForm.validation
                    : undefined,
        }

        updateFieldMutation.mutate(fieldData)
    }

    const handleEditField = (field: any) => {
        setEditingField(field)
        setFieldForm({
            label: field.label,
            description: field.description || '',
            type: field.type,
            required: field.required,
            placeholder: field.placeholder || '',
            defaultValue: field.defaultValue || '',
            options: field.options || [],
            validation: field.validation || {},
        })
    }

    const handleDragEnd = (result: any) => {
        if (!result.destination) return

        const items = Array.from(form.fields)
        const [reorderedItem] = items.splice(result.source.index, 1)
        items.splice(result.destination.index, 0, reorderedItem!)

        const fieldOrders = items.map((field, index) => ({
            fieldId: field.id,
            order: index,
        }))

        reorderFieldsMutation.mutate({
            formId: form.id,
            fieldOrders,
        })
    }

    const addOption = () => {
        setFieldForm((prev) => ({
            ...prev,
            options: [...prev.options, { value: '', label: '' }],
        }))
    }

    const updateOption = (
        index: number,
        field: 'value' | 'label',
        value: string
    ) => {
        setFieldForm((prev) => ({
            ...prev,
            options: prev.options.map((option, i) =>
                i === index ? { ...option, [field]: value } : option
            ),
        }))
    }

    const removeOption = (index: number) => {
        setFieldForm((prev) => ({
            ...prev,
            options: prev.options.filter((_, i) => i !== index),
        }))
    }

    const needsOptions = [
        'select',
        'multiselect',
        'radio',
        'checkbox',
    ].includes(fieldForm.type)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Form Fields</h2>
                <Button onClick={() => setIsAddFieldDialogOpen(true)}>
                    <Plus size={16} className="mr-2" />
                    Add Field
                </Button>
            </div>

            {form.fields.length === 0 ? (
                <Card>
                    <CardContent className="flex h-32 items-center justify-center">
                        <div className="text-center">
                            <p className="text-muted-foreground">
                                No fields added yet
                            </p>
                            <Button
                                variant="outline"
                                className="mt-2"
                                onClick={() => setIsAddFieldDialogOpen(true)}
                            >
                                Add your first field
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="fields">
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="space-y-4"
                            >
                                {form.fields.map((field, index) => {
                                    const IconComponent =
                                        FIELD_TYPE_ICONS[
                                            field.type as keyof typeof FIELD_TYPE_ICONS
                                        ] || Type
                                    return (
                                        <Draggable
                                            key={field.id}
                                            draggableId={field.id.toString()}
                                            index={index}
                                        >
                                            {(provided) => (
                                                <Card
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className="relative"
                                                >
                                                    <CardHeader className="pb-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    {...provided.dragHandleProps}
                                                                    className="cursor-grab text-muted-foreground hover:text-foreground"
                                                                >
                                                                    <GripVertical
                                                                        size={
                                                                            16
                                                                        }
                                                                    />
                                                                </div>
                                                                <IconComponent
                                                                    size={16}
                                                                    className="text-muted-foreground"
                                                                />
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <h3 className="font-medium">
                                                                            {
                                                                                field.label
                                                                            }
                                                                        </h3>
                                                                        {field.required && (
                                                                            <Badge
                                                                                variant="secondary"
                                                                                className="text-xs"
                                                                            >
                                                                                Required
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {
                                                                            FIELD_TYPE_LABELS[
                                                                                field.type as keyof typeof FIELD_TYPE_LABELS
                                                                            ]
                                                                        }
                                                                        {field.description &&
                                                                            ` • ${field.description}`}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        handleEditField(
                                                                            field
                                                                        )
                                                                    }
                                                                >
                                                                    <Edit2
                                                                        size={
                                                                            14
                                                                        }
                                                                    />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        deleteFieldMutation.mutate(
                                                                            {
                                                                                fieldId:
                                                                                    field.id,
                                                                            }
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2
                                                                        size={
                                                                            14
                                                                        }
                                                                    />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </CardHeader>
                                                </Card>
                                            )}
                                        </Draggable>
                                    )
                                })}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            )}

            {/* Add/Edit Field Dialog */}
            <Dialog
                open={isAddFieldDialogOpen || !!editingField}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsAddFieldDialogOpen(false)
                        setEditingField(null)
                        resetFieldForm()
                    }
                }}
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingField ? 'Edit Field' : 'Add New Field'}
                        </DialogTitle>
                        <DialogDescription>
                            Configure the field properties and validation rules
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="field-label">Label *</Label>
                                <Input
                                    id="field-label"
                                    value={fieldForm.label}
                                    onChange={(e) =>
                                        setFieldForm((prev) => ({
                                            ...prev,
                                            label: e.target.value,
                                        }))
                                    }
                                    placeholder="Enter field label"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="field-type">Type</Label>
                                <Select
                                    value={fieldForm.type}
                                    onValueChange={(value) =>
                                        setFieldForm((prev) => ({
                                            ...prev,
                                            type: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FORM_FIELD_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {
                                                    FIELD_TYPE_LABELS[
                                                        type as keyof typeof FIELD_TYPE_LABELS
                                                    ]
                                                }
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="field-description">
                                Description
                            </Label>
                            <Input
                                id="field-description"
                                value={fieldForm.description}
                                onChange={(e) =>
                                    setFieldForm((prev) => ({
                                        ...prev,
                                        description: e.target.value,
                                    }))
                                }
                                placeholder="Optional description or help text"
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="field-placeholder">
                                    Placeholder
                                </Label>
                                <Input
                                    id="field-placeholder"
                                    value={fieldForm.placeholder}
                                    onChange={(e) =>
                                        setFieldForm((prev) => ({
                                            ...prev,
                                            placeholder: e.target.value,
                                        }))
                                    }
                                    placeholder="Placeholder text"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="field-default">
                                    Default Value
                                </Label>
                                <Input
                                    id="field-default"
                                    value={fieldForm.defaultValue}
                                    onChange={(e) =>
                                        setFieldForm((prev) => ({
                                            ...prev,
                                            defaultValue: e.target.value,
                                        }))
                                    }
                                    placeholder="Default value"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="field-required"
                                checked={fieldForm.required}
                                onCheckedChange={(checked) =>
                                    setFieldForm((prev) => ({
                                        ...prev,
                                        required: checked,
                                    }))
                                }
                            />
                            <Label htmlFor="field-required">
                                Required field
                            </Label>
                        </div>

                        {needsOptions && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Options</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addOption}
                                    >
                                        <Plus size={14} className="mr-1" />
                                        Add Option
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {fieldForm.options.map((option, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2"
                                        >
                                            <Input
                                                placeholder="Option value"
                                                value={option.value}
                                                onChange={(e) =>
                                                    updateOption(
                                                        index,
                                                        'value',
                                                        e.target.value
                                                    )
                                                }
                                            />
                                            <Input
                                                placeholder="Option label"
                                                value={option.label}
                                                onChange={(e) =>
                                                    updateOption(
                                                        index,
                                                        'label',
                                                        e.target.value
                                                    )
                                                }
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    removeOption(index)
                                                }
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsAddFieldDialogOpen(false)
                                setEditingField(null)
                                resetFieldForm()
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={
                                editingField
                                    ? handleUpdateField
                                    : handleAddField
                            }
                            disabled={!fieldForm.label.trim()}
                        >
                            {editingField ? 'Update Field' : 'Add Field'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
