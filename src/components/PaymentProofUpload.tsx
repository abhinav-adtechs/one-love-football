import { useState, useRef } from 'react'

interface PaymentProofUploadProps {
  onFileSelected: (file: File | undefined) => void
}

export default function PaymentProofUpload({ onFileSelected }: PaymentProofUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPreview(URL.createObjectURL(file))
      onFileSelected(file)
    } else {
      setPreview(null)
      onFileSelected(undefined)
    }
  }

  return (
    <div>
      <div className="upload-area" onClick={() => inputRef.current?.click()}>
        {preview ? (
          <img src={preview} alt="Payment proof" className="upload-preview" />
        ) : (
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>Upload Payment Screenshot</p>
            <p className="subtle" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
              Tap to select image
            </p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}
