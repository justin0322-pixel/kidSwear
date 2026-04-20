'use client'

import { useFieldArray, useFormContext } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type VariantRow = {
  size: string
  color: string
  stock: number
  price: string
}

export function VariantEditor() {
  const {
    register,
    formState: { errors },
  } = useFormContext()

  const { fields, append, remove } = useFieldArray({ name: 'variants' })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">SKU 變體</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ size: '', color: '', stock: 0, price: '' })}
        >
          + 新增變體
        </Button>
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4 border rounded-lg">
          尚未新增變體，請點右上角「新增變體」
        </p>
      )}

      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-12 gap-2 items-start border rounded-lg p-3">
          <div className="col-span-3 space-y-1">
            <Label className="text-xs text-gray-500">尺寸</Label>
            <Input
              placeholder="例：80cm"
              {...register(`variants.${index}.size`)}
            />
          </div>
          <div className="col-span-3 space-y-1">
            <Label className="text-xs text-gray-500">顏色</Label>
            <Input
              placeholder="例：粉紅"
              {...register(`variants.${index}.color`)}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs text-gray-500">庫存</Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              {...register(`variants.${index}.stock`, { valueAsNumber: true })}
            />
          </div>
          <div className="col-span-3 space-y-1">
            <Label className="text-xs text-gray-500">單價（選填）</Label>
            <Input
              placeholder="同批發價"
              {...register(`variants.${index}.price`)}
            />
          </div>
          <div className="col-span-1 flex items-end justify-end pb-1">
            <button
              type="button"
              onClick={() => remove(index)}
              className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
          {(errors.variants as undefined | { [k: number]: { size?: { message?: string } } })?.[index]
            ?.size && (
            <p className="col-span-12 text-xs text-red-500">
              {(errors.variants as { [k: number]: { size?: { message?: string } } })[index].size
                ?.message}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
