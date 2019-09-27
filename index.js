const util = require('util')

const getFiles = require('./getFiles')
const format = require('./format')

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = bot => {
  bot.on("pull_request.opened", check)
  bot.on("pull_request.synchronize", check)

  async function check (context) {
    const { owner, repo, number } = context.issue()
		const { sha } = context.payload.pull_request.head

    // GH API
    const { checks, pulls, git } = context.github

		// Set PR check status
    const statusInfo = context.repo({
      name: "gitbot-format",
      head_sha: sha,
    })

    // Queued
    await checks.create({
      ...statusInfo,
      status: "queued",
      output: {
        title: 'gitbot-format',
        summary: 'Waiting to format...'
      }
    })

    // In progress
    const started_at = new Date()
    await checks.create({
      ...statusInfo,
      status: "in_progress",
      started_at,
      output: {
        title: 'gitbot-format',
        summary: 'Formatting...'
      }
    })

    // Get changed files
    const files = await getFiles(context.github, {
      owner,
      repo,
      pull_number: number,
    })

    files.forEach(({ filename, content }) => {
      bot.log(`${filename} : ${content}`)
    })

    // Run formatter

    // If changed -> push blobs + create commit

    // Completed
    await checks.create({
      ...statusInfo,
      status: "completed",
      started_at,
      completed_at: new Date(),
      conclusion: "success",
      output: {
        title: 'gitbot-format',
        summary: 'Formatted all right!'
      }
    })
  }

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}
