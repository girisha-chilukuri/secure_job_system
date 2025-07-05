interface EnvConfig {
  [key: string]: {
    required: boolean;
    description: string;
    defaultValue?: string;
  };
}

const ENV_CONFIG: EnvConfig = {
  // Database
  MONGO_URI: {
    required: true,
    description: 'MongoDB connection string'
  },
  
  // Server
  PORT: {
    required: false,
    description: 'Server port number',
    defaultValue: '3000'
  },
  NODE_ENV: {
    required: false,
    description: 'Node environment (development, production, test)',
    defaultValue: 'development'
  },
  
  // Security
  ENCRYPTION_KEY: {
    required: true,
    description: '32-byte encryption key for job payload encryption'
  },
  
  // Email (if using email notifications)
  SMTP_PORT: {
    required: false,
    description: 'SMTP server port',
    defaultValue: '587'
  },
  SMTP_USER: {
    required: true,
    description: 'SMTP username'
  },
  SMTP_PASS: {
    required: true,
    description: 'SMTP password'
  },
  
  // Job Worker
  WORKER_POLL_INTERVAL: {
    required: false,
    description: 'Job worker polling interval in milliseconds',
    defaultValue: '180000' // 3 minutes
  },
  WORKER_BATCH_SIZE: {
    required: false,
    description: 'Number of jobs to process in each batch',
    defaultValue: '2'
  },
  STUCK_JOB_TIMEOUT: {
    required: false,
    description: 'Timeout for stuck jobs in milliseconds',
    defaultValue: '300000' // 5 minutes
  }
};

export function validateEnvironmentVariables(): void {
  const missingVars: string[] = [];
  const invalidVars: string[] = [];

  for (const [key, config] of Object.entries(ENV_CONFIG)) {
    const value = process.env[key];
    
    if (config.required && !value) {
      missingVars.push(`${key} - ${config.description}`);
    } else if (value) {
      // Validate specific variables
      if (key === 'ENCRYPTION_KEY' && value.length !== 32) {
        invalidVars.push(`${key} - Must be 16 bytes (32 hex characters), got ${value.length} characters`);
      }
      if (key === 'PORT' && (isNaN(Number(value)) || Number(value) < 1 || Number(value) > 65535)) {
        invalidVars.push(`${key} - Must be a valid port number (1-65535)`);
      }
      if (key === 'WORKER_POLL_INTERVAL' && (isNaN(Number(value)) || Number(value) < 1000)) {
        invalidVars.push(`${key} - Must be a valid number >= 1000 milliseconds`);
      }
      if (key === 'WORKER_BATCH_SIZE' && (isNaN(Number(value)) || Number(value) < 1)) {
        invalidVars.push(`${key} - Must be a valid number >= 1`);
      }
      if (key === 'STUCK_JOB_TIMEOUT' && (isNaN(Number(value)) || Number(value) < 1000)) {
        invalidVars.push(`${key} - Must be a valid number >= 1000 milliseconds`);
      }
    }
  }

  if (missingVars.length > 0 || invalidVars.length > 0) {
    let errorMessage = 'Environment validation failed:\n\n';
    
    if (missingVars.length > 0) {
      errorMessage += 'Missing required environment variables:\n';
      missingVars.forEach(varName => {
        errorMessage += `  - ${varName}\n`;
      });
      errorMessage += '\n';
    }
    
    if (invalidVars.length > 0) {
      errorMessage += 'Invalid environment variables:\n';
      invalidVars.forEach(varName => {
        errorMessage += `  - ${varName}\n`;
      });
      errorMessage += '\n';
    }
    
    errorMessage += 'Please check your .env file and ensure all required variables are set correctly.';
    
    throw new Error(errorMessage);
  }
}

export function getEnvVar(key: string): string {
  const config = ENV_CONFIG[key];
  if (!config) {
    throw new Error(`Unknown environment variable: ${key}`);
  }
  
  const value = process.env[key] || config.defaultValue;
  if (config.required && !value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  
  return value!;
}

export function getEnvVarAsNumber(key: string): number {
  const value = getEnvVar(key);
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return num;
}

export function getEnvVarAsBoolean(key: string): boolean {
  const value = getEnvVar(key);
  return value.toLowerCase() === 'true' || value === '1';
} 