import { useEffect, useRef, useState } from 'react'
import { Button } from './ui/button'
import { Label } from './ui/label'

export default function Modal({ isOpen, onClose, title, fields, onSubmit }) {
  const modalRef = useRef(null)
  const firstInputRef = useRef(null)
  const [transparentFields, setTransparentFields] = useState({})

  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      firstInputRef.current.focus()
    }

    const initialTransparent = {}
    fields.forEach(field => {
      if (field.type === 'colorWithTransparent') {
        initialTransparent[field.name] = field.defaultValue === 'transparent' || field.defaultValue?.startsWith('rgba')
      }
    })
    setTransparentFields(initialTransparent)
  }, [isOpen, fields])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const values = {}
    fields.forEach(field => {
      if (field.type === 'colorWithTransparent' && transparentFields[field.name]) {
        values[field.name] = 'transparent'
      } else {
        values[field.name] = formData.get(field.name)
      }
    })
    onSubmit(values)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-[80vw] max-h-[80vh] flex flex-col"
      >
        <div className="p-6 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {fields.map((field, index) => (
              <div key={field.name}>
                <Label htmlFor={field.name} className="text-sm mb-1.5 block">
                  {field.label}
                </Label>
                {field.type === 'color' ? (
                  <input
                    ref={index === 0 ? firstInputRef : null}
                    id={field.name}
                    name={field.name}
                    type="color"
                    defaultValue={field.defaultValue}
                    className="w-full h-10 rounded-md border border-input cursor-pointer bg-background"
                  />
                ) : field.type === 'colorWithTransparent' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        ref={index === 0 ? firstInputRef : null}
                        id={field.name}
                        name={field.name}
                        type="color"
                        defaultValue={
                          field.defaultValue === 'transparent' || field.defaultValue?.startsWith('rgba')
                            ? '#ffffff'
                            : field.defaultValue
                        }
                        disabled={transparentFields[field.name]}
                        className="flex-1 h-10 rounded-md border border-input cursor-pointer bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={transparentFields[field.name] || false}
                          onChange={(e) => setTransparentFields(prev => ({
                            ...prev,
                            [field.name]: e.target.checked
                          }))}
                          className="w-4 h-4 rounded border-input cursor-pointer"
                        />
                        <span className="text-sm">Transparent</span>
                      </label>
                    </div>
                  </div>
                ) : field.type === 'checkbox' ? (
                  <div className="flex items-center">
                    <input
                      ref={index === 0 ? firstInputRef : null}
                      id={field.name}
                      name={field.name}
                      type="checkbox"
                      defaultChecked={field.defaultValue}
                      className="w-4 h-4 rounded border-input cursor-pointer"
                    />
                  </div>
                ) : (
                  <input
                    ref={index === 0 ? firstInputRef : null}
                    id={field.name}
                    name={field.name}
                    type={field.type || 'text'}
                    defaultValue={field.defaultValue}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    placeholder={field.placeholder}
                    className="w-full h-10 rounded-md border border-input px-3 bg-background text-sm"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="p-6 border-t border-border flex gap-2 justify-end flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit">
              Apply
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
