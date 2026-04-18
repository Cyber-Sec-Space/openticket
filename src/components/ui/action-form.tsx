"use client"

import React, { useTransition, useRef } from "react"

interface ActionFormProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'action'> {
  action: (formData: FormData) => void | Promise<void>;
  resetOnSuccess?: boolean;
}

export function ActionForm({ action, children, className, resetOnSuccess = true, ...props }: ActionFormProps) {
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      await action(formData)
      if (resetOnSuccess && formRef.current) {
        formRef.current.reset()
      }
    })
  }

  return (
    <form 
      ref={formRef}
      className={className} 
      onSubmit={handleSubmit}
      {...props}
    >
      {/* 
        We pass a function cloning the children to optionally inject isPending context if needed in the future,
        but for now we just render children directly. Buttons inside can manually handle their own loading state, 
        or we could provide a context. 
      */}
      {/* 
        A slightly hacky but effective way to disable the fieldset during pending without context
      */}
      <fieldset disabled={isPending} className="contents">
        {children}
      </fieldset>
    </form>
  )
}
