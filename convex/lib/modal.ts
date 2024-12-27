import { z } from "zod";

const modalSecret = process.env.MODAL_SECRET;
const modalUrl = process.env.MODAL_URL;
let client: ModalClient | null = null;

export function modalClient() {
  if (client) {
    return client;
  }
  if (!modalSecret) {
    throw new Error('MODAL_SECRET is not set');
  }
  if (!modalUrl) {
    throw new Error('MODAL_URL is not set');
  }
  client = new ModalClient(modalSecret, modalUrl);
  return client;
}

export const createSandboxArgs = z.object({
  apt_packages: z.array(z.string()).optional(),
  pip_packages: z.array(z.string()).optional(),
})
export const createSandboxResponse = z.object({
  sandbox_id: z.string(),
})

export const terminateSandboxArgs = z.object({
  sandbox_id: z.string(),
})
export const terminateSandboxResponse = z.object({
  status: z.string(),
})

export const execCommandArgs = z.object({
  sandbox_id: z.string(),
  command: z.array(z.string()),
})
export const execCommandResponse = z.object({
  returncode: z.number(),
  stdout: z.string(),
  stderr: z.string(),
})

export const readFileArgs = z.object({
  sandbox_id: z.string(),
  path: z.string(),
})
export const readFileResponse = z.object({
  contents: z.string(),
})

export const writeFileArgs = z.object({
  sandbox_id: z.string(),
  path: z.string(),
  contents: z.string(),
})
export const writeFileResponse = z.object({
  status: z.string(),
})

class ModalClient {
  constructor(private secret: string, private url: string) { }

  async createSandbox(args: z.infer<typeof createSandboxArgs>) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: this.secret,
        type: 'create_sandbox',
        ...args,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to create sandbox: ${response.statusText}`);
    }
    const data = await response.json();
    return createSandboxResponse.parse(data)
  }

  async terminateSandbox(args: z.infer<typeof terminateSandboxArgs>) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: this.secret,
        type: 'terminate_sandbox',
        ...args,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to terminate sandbox: ${response.statusText}`);
    }
    const data = await response.json();
    return terminateSandboxResponse.parse(data);
  }

  async execCommand(args: z.infer<typeof execCommandArgs>) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: this.secret,
        type: 'exec_command',
        ...args,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to execute command: ${response.statusText}`);
    }
    const data = await response.json();
    return execCommandResponse.parse(data);
  }

  async readFile(args: z.infer<typeof readFileArgs>) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: this.secret,
        type: 'read_file',
        ...args,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to read file: ${response.statusText}`);
    }
    const data = await response.json();
    return readFileResponse.parse(data);
  }

  async writeFile(args: z.infer<typeof writeFileArgs>) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: this.secret,
        type: 'write_file',
        ...args,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to write file: ${response.statusText}`);
    }
    const data = await response.json();
    return writeFileResponse.parse(data);
  }
}
