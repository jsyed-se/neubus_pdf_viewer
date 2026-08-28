import type { EngineCommand, EngineResult } from './types';

interface PendingCall {
  resolve: (value: EngineResult) => void;
  reject: (reason: Error) => void;
}

export class PdfEngineClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingCall>();

  private getWorker() {
    if (this.worker) return this.worker;
    const worker = new Worker(
      new URL('../workers/pdfEngine.worker.ts', import.meta.url),
      { type: 'module', name: 'atlas-mupdf-engine' },
    );
    worker.onmessage = (event: MessageEvent<{ id: number; result?: EngineResult; error?: string }>) => {
      const call = this.pending.get(event.data.id);
      if (!call) return;
      this.pending.delete(event.data.id);
      if (event.data.error) call.reject(new Error(event.data.error));
      else call.resolve(event.data.result ?? {});
    };
    worker.onerror = (event) => {
      const error = new Error(event.message || 'The PDF processing worker failed.');
      for (const call of this.pending.values()) call.reject(error);
      this.pending.clear();
    };
    this.worker = worker;
    return worker;
  }

  call(command: EngineCommand): Promise<EngineResult> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.getWorker().postMessage({ id, command });
    });
  }

  resetIfStarted(): Promise<EngineResult> {
    if (!this.worker) return Promise.resolve({});
    return this.call({ type: 'reset' });
  }

  destroy() {
    this.worker?.terminate();
    this.worker = null;
    const error = new Error('PDF engine was closed.');
    for (const call of this.pending.values()) call.reject(error);
    this.pending.clear();
  }
}
