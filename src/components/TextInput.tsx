import { useId, useRef, useState, type ChangeEvent } from 'react';
import { countWords } from '../lib/text';

interface Props {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

const MAX_FILE_BYTES = 1_000_000;

/** Labeled textarea with word count, clear, and plain-text file import. */
export function TextInput({ label, hint, value, onChange, placeholder }: Props) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState('');

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileError('That file is over 1 MB. Paste the text instead.');
      return;
    }
    setFileError('');
    onChange(await file.text());
  }

  return (
    <section className="panel input-panel">
      <div className="input-head">
        <label htmlFor={id}>{label}</label>
        <span className="muted small">{countWords(value)} words</span>
      </div>
      <p className="muted small hint">{hint}</p>
      <textarea
        id={id}
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="input-actions">
        <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
          Import .txt / .md
        </button>
        <button type="button" className="btn ghost" onClick={() => onChange('')} disabled={!value}>
          Clear
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.markdown,text/plain,text/markdown"
          hidden
          aria-label={`Import ${label} from file`}
          onChange={handleFile}
        />
      </div>
      {fileError && (
        <p role="alert" className="error small">
          {fileError}
        </p>
      )}
    </section>
  );
}
