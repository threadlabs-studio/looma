const baselineCommands = new Set(['test', 'update'])
export const canonicalStorywrightEnv = 'STORYWRIGHT_CANONICAL_RUNTIME'

export function assertCanonicalStorywrightRuntime({
  argv = process.argv,
  env = process.env,
} = {}) {
  const command = argv.find((argument) => baselineCommands.has(argument))

  if (!command || env[canonicalStorywrightEnv] === '1') {
    return
  }

  throw new Error(
    `Direct Storywright ${command} is blocked because it can produce non-canonical visual results. `
      + `Use "node ./scripts/run-storywright-docker.mjs ${command}" instead.`,
  )
}
