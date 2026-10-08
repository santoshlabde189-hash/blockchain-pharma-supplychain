export class MockStub {
  private state = new Map<string, Buffer>();
  private events = new Map<string, Buffer>();

  async getState(key: string): Promise<Buffer> {
    return this.state.get(key) || Buffer.from('');
  }

  async putState(key: string, value: Buffer): Promise<void> {
    this.state.set(key, value);
  }

  async deleteState(key: string): Promise<void> {
    this.state.delete(key);
  }

  setEvent(name: string, payload: Buffer): void {
    this.events.set(name, payload);
  }

  getEvent(name: string): Buffer | undefined {
    return this.events.get(name);
  }
}

export class MockClientIdentity {
  private attrs: Record<string, string>;

  constructor(attrs: Record<string, string> = {}) {
    this.attrs = attrs;
  }

  getAttributeValue(name: string): string | null {
    return this.attrs[name] || null;
  }
}

export class MockContext {
  public stub: MockStub;
  public clientIdentity: MockClientIdentity;

  constructor(attrs: Record<string, string> = {}) {
    this.stub = new MockStub();
    this.clientIdentity = new MockClientIdentity(attrs);
  }
}
