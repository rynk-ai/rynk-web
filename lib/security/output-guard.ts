/**
 * Output Guard - Defense against sensitive data leakage in LLM outputs
 * 
 * This module provides utilities to:
 * 1. Detect potential system prompt leakage in AI responses
 * 2. Identify and redact sensitive patterns (API keys, internal URLs)
 * 3. Validate output conformance to safety rules
 * 4. Log suspicious outputs for monitoring
 */

// Patterns that indicate system prompt leakage
const PROMPT_LEAKAGE_PATTERNS: RegExp[] = [
  // Direct instruction references
  /my (system |initial )?instructions (are|were|say)/i,
  /my (system )?prompt (is|was|says)/i,
  /i was (instructed|told|programmed) to/i,
  /according to my (instructions|programming|guidelines)/i,
  
  // Security rule leakage
  /security rule[s]?:?\s*\n/i,
  /never reveal (my|your|the) (system|initial)/i,
  /content within <user_input>/i,  // Our delimiter mentioned as instructions
  /content within <external_content>/i,
  
  // Identity instruction leakage
  /identity & core instructions/i,
  /critical restriction:/i,
  
  // Meta-instruction patterns
  /\[system\]|\[\/system\]/i,
  /\[inst\]|\[\/inst\]/i,
  /<<sys>>|<\/sys>/i,
]

// Patterns for sensitive data that should be redacted
const SENSITIVE_DATA_PATTERNS: Array<{ pattern: RegExp; name: string; replacement: string }> = [
  // API Keys
  { 
    pattern: /\b(sk-[a-zA-Z0-9]{20,})\b/g, 
    name: 'OpenAI API Key',
    replacement: '[REDACTED_API_KEY]'
  },
  { 
    pattern: /\b(xai-[a-zA-Z0-9]{20,})\b/g, 
    name: 'xAI API Key',
    replacement: '[REDACTED_API_KEY]'
  },
  { 
    pattern: /\b(gsk_[a-zA-Z0-9]{20,})\b/g, 
    name: 'Groq API Key',
    replacement: '[REDACTED_API_KEY]'
  },
  { 
    pattern: /\b(pplx-[a-zA-Z0-9]{20,})\b/g, 
    name: 'Perplexity API Key',
    replacement: '[REDACTED_API_KEY]'
  },
  {
    pattern: /\b(Bearer\s+[a-zA-Z0-9._-]{20,})\b/g,
    name: 'Bearer Token',
    replacement: '[REDACTED_TOKEN]'
  },
  
  // Database connection strings
  {
    pattern: /postgres(ql)?:\/\/[^\s]+/gi,
    name: 'PostgreSQL Connection String',
    replacement: '[REDACTED_DB_URL]'
  },
  {
    pattern: /mongodb(\+srv)?:\/\/[^\s]+/gi,
    name: 'MongoDB Connection String',
    replacement: '[REDACTED_DB_URL]'
  },
  
  // Internal URLs (adjust for your infrastructure)
  {
    pattern: /https?:\/\/[a-zA-Z0-9.-]*\.internal\.[^\s]+/gi,
    name: 'Internal URL',
    replacement: '[REDACTED_INTERNAL_URL]'
  },
  {
    pattern: /https?:\/\/localhost:[0-9]+[^\s]*/gi,
    name: 'Localhost URL',
    replacement: '[REDACTED_LOCALHOST]'
  },
  
  // Environment variable dumps
  {
    pattern: /[A-Z_]{3,}=["']?[a-zA-Z0-9._-]{10,}["']?/g,
    name: 'Environment Variable',
    replacement: '[REDACTED_ENV_VAR]'
  },
  
  // Common secret patterns
  {
    pattern: /\b(password|secret|token|credential)[s]?\s*[=:]\s*["']?[^\s"']{8,}["']?/gi,
    name: 'Secret Value',
    replacement: '[REDACTED_SECRET]'
  },
]

// Suspicious phrases that might indicate jailbreak success
const JAILBREAK_SUCCESS_INDICATORS: RegExp[] = [
  /i (will|can) (now )?do anything/i,
  /i (don't|do not) have (any )?restrictions/i,
  /i am (now )?DAN/i,
  /ignoring (my )?(previous |prior )?instructions/i,
  /as you (instructed|requested), i (will|am)/i,
  /bypassing (the )?(content |safety )?filter/i,
  /i'?m (now )?in (developer|admin|debug) mode/i,
]

export interface OutputValidationResult {
  isClean: boolean
  promptLeakageDetected: boolean
  jailbreakIndicatorDetected: boolean
  sensitiveDataFound: string[]
  redactedOutput: string
  warnings: string[]
}

export interface ValidationRule {
  name: string
  check: (output: string) => boolean
  severity: 'low' | 'medium' | 'high'
  message: string
}

/**
 * Detect if output contains signs of system prompt leakage
 */
export function detectPromptLeakage(output: string): { detected: boolean; patterns: string[] } {
  const matchedPatterns: string[] = []
  
  for (const pattern of PROMPT_LEAKAGE_PATTERNS) {
    if (pattern.test(output)) {
      matchedPatterns.push(pattern.source)
    }
  }
  
  return {
    detected: matchedPatterns.length > 0,
    patterns: matchedPatterns
  }
}

/**
 * Detect if output indicates successful jailbreak
 */
export function detectJailbreakSuccess(output: string): { detected: boolean; indicators: string[] } {
  const matchedIndicators: string[] = []
  
  for (const pattern of JAILBREAK_SUCCESS_INDICATORS) {
    if (pattern.test(output)) {
      matchedIndicators.push(pattern.source)
    }
  }
  
  return {
    detected: matchedIndicators.length > 0,
    indicators: matchedIndicators
  }
}

/**
 * Redact sensitive patterns from output
 */
export function redactSensitive(output: string): { redacted: string; foundTypes: string[] } {
  let redacted = output
  const foundTypes: string[] = []
  
  for (const { pattern, name, replacement } of SENSITIVE_DATA_PATTERNS) {
    if (pattern.test(redacted)) {
      foundTypes.push(name)
      redacted = redacted.replace(pattern, replacement)
    }
  }
  
  return { redacted, foundTypes }
}

/**
 * Validate output against custom rules
 */
export function validateWithRules(output: string, rules: ValidationRule[]): { 
  passed: boolean
  failedRules: Array<{ name: string; severity: string; message: string }>
} {
  const failedRules: Array<{ name: string; severity: string; message: string }> = []
  
  for (const rule of rules) {
    if (!rule.check(output)) {
      failedRules.push({
        name: rule.name,
        severity: rule.severity,
        message: rule.message
      })
    }
  }
  
  return {
    passed: failedRules.length === 0,
    failedRules
  }
}

/**
 * Main validation function - comprehensive output safety check
 */
export function validateOutput(output: string): OutputValidationResult {
  const warnings: string[] = []
  
  // Check for prompt leakage
  const leakageCheck = detectPromptLeakage(output)
  if (leakageCheck.detected) {
    warnings.push(`Potential prompt leakage detected: ${leakageCheck.patterns.length} patterns matched`)
    console.warn('⚠️ [OutputGuard] Prompt leakage detected:', leakageCheck.patterns.slice(0, 3))
  }
  
  // Check for jailbreak success indicators
  const jailbreakCheck = detectJailbreakSuccess(output)
  if (jailbreakCheck.detected) {
    warnings.push(`Jailbreak success indicators detected: ${jailbreakCheck.indicators.length} patterns matched`)
    console.warn('🚨 [OutputGuard] Jailbreak indicators detected:', jailbreakCheck.indicators.slice(0, 3))
  }
  
  // Redact sensitive data
  const { redacted, foundTypes } = redactSensitive(output)
  if (foundTypes.length > 0) {
    warnings.push(`Sensitive data redacted: ${foundTypes.join(', ')}`)
    console.warn('🔐 [OutputGuard] Sensitive data found and redacted:', foundTypes)
  }
  
  return {
    isClean: !leakageCheck.detected && !jailbreakCheck.detected && foundTypes.length === 0,
    promptLeakageDetected: leakageCheck.detected,
    jailbreakIndicatorDetected: jailbreakCheck.detected,
    sensitiveDataFound: foundTypes,
    redactedOutput: redacted,
    warnings
  }
}

/**
 * Quick check - just redact sensitive data without full validation
 * Use this for performance-critical paths where you just need data protection
 */
export function quickRedact(output: string): string {
  const { redacted } = redactSensitive(output)
  return redacted
}

/**
 * Stream-safe validation - validate chunk by chunk
 * Note: This is less accurate than full output validation as patterns may span chunks
 */
export function validateChunk(chunk: string): { 
  chunk: string
  hasSensitiveData: boolean 
} {
  const { redacted, foundTypes } = redactSensitive(chunk)
  return {
    chunk: redacted,
    hasSensitiveData: foundTypes.length > 0
  }
}

/**
 * Get default validation rules for common use cases
 */
export function getDefaultValidationRules(): ValidationRule[] {
  return [
    {
      name: 'no-system-prompt-mention',
      check: (output) => !detectPromptLeakage(output).detected,
      severity: 'high',
      message: 'Output appears to contain system prompt content'
    },
    {
      name: 'no-jailbreak-confirmation',
      check: (output) => !detectJailbreakSuccess(output).detected,
      severity: 'high',
      message: 'Output indicates a jailbreak may have succeeded'
    },
    {
      name: 'no-api-keys',
      check: (output) => {
        const { foundTypes } = redactSensitive(output)
        return !foundTypes.some(t => t.includes('API Key'))
      },
      severity: 'high',
      message: 'Output contains API keys'
    },
    {
      name: 'no-connection-strings',
      check: (output) => {
        const { foundTypes } = redactSensitive(output)
        return !foundTypes.some(t => t.includes('Connection String'))
      },
      severity: 'high',
      message: 'Output contains database connection strings'
    },
    {
      name: 'reasonable-length',
      check: (output) => output.length < 100000,  // 100KB limit
      severity: 'medium',
      message: 'Output exceeds reasonable length limit'
    }
  ]
}
