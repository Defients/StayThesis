import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// globals are off, so RTL's auto-cleanup never registers — do it here.
afterEach(() => cleanup());
