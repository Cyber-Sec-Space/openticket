"use client"
import React, { useState, KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Input } from './input'
import { Badge } from './badge'
import { cn } from '@/lib/utils'

interface TagInputProps {
  name?: string
  initialTags?: string[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function TagInput({ name = 'tags', initialTags = [], placeholder = 'Add tags (press Enter)...', className, disabled }: TagInputProps) {
  const [tags, setTags] = useState<string[]>(initialTags)
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const newTag = inputValue.trim().replace(/,/g, '')
      if (newTag) {
        // Prepend '#' automatically if it doesn't have it
        const formattedTag = newTag.startsWith('#') ? newTag : `#${newTag}`
        if (!tags.includes(formattedTag)) {
          setTags([...tags, formattedTag])
        }
        setInputValue('')
      }
    }
  }

  const removeTag = (indexToRemove: number) => {
    if (disabled) return;
    setTags(tags.filter((_, i) => i !== indexToRemove))
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, i) => (
          <Badge key={i} variant="secondary" className="bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 border-purple-500/30 pl-2 pr-1 py-1 text-sm font-mono tracking-wide">
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(i)}
                className="ml-1 rounded-full hover:bg-black/20 p-0.5 focus:outline-none"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
      {!disabled && (
         <Input
           value={inputValue}
           onChange={(e) => setInputValue(e.target.value)}
           onKeyDown={handleKeyDown}
           placeholder={placeholder}
           className="bg-black/30 border-white/10"
         />
      )}
      {/* Hidden inputs to capture tags in native FormData */}
      {tags.map((tag, i) => (
        <input key={`${tag}-${i}`} type="hidden" name={name} value={tag} />
      ))}
      {tags.length === 0 && <input type="hidden" name={name} value="" />}
    </div>
  )
}
