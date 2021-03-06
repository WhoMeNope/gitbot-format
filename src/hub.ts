import yaml from 'js-yaml'
import gitmodulesParser from './gitmodulesParser'

export async function getGitmodules(
  {owner, repo, ref}: types.PullRequestInfo,
  repos: any,
  info: (message: string) => void
) {
  const gitmodulesFilename = '.gitmodules'

  info(`Trying to get ${gitmodulesFilename} from current branch`)
  try {
    const response = await repos.getContents({
      owner,
      repo,
      path: gitmodulesFilename,
      ref,
    })
    const buffer = Buffer.from(response.data.content, 'base64')
    const text = buffer.toString('utf8')

    info(`Got ${gitmodulesFilename} from ${ref} branch`)

    return gitmodulesParser.parsePaths(text)
  }
  // could not get or does not exist
  catch (e) {
    info(`Could not get ${gitmodulesFilename}, most likely does not exist.`)
    return []
  }
}

export async function getStylefile(
  {owner, repo, ref}: types.PullRequestInfo,
  repos: any,
  info: (message: string) => void
) {
  const stylefileName = '.clang-format'

  // try getting stylefile from default branch (master) first
  try {
    const stylefileResponse = await repos.getContents({
      owner,
      repo,
      path: stylefileName,
    })
    const buffer = Buffer.from(stylefileResponse.data.content, 'base64')
    const text = buffer.toString('utf8')

    // flatten YAML docs into single and convert YAML to JSON
    const json = JSON.stringify(yaml
      .safeLoadAll(text)
      .reduce((acc: object, doc: object) => { return {...acc, ...doc} }, {}))

    info(`Got stylefile from default branch : ${json}`)
    return json
  }
  // try getting stylefile from current branch
  catch (e) {
    info('Could not get stylefile from default branch, trying PR branch.')
    try {
      const stylefileResponse = await repos.getContents({
        owner,
        repo,
        path: stylefileName,
        ref,
      })
      const buffer = Buffer.from(stylefileResponse.data.content, 'base64')
      const text = buffer.toString('utf8')

      // flatten YAML docs into single and convert YAML to JSON
      const json = JSON.stringify(yaml
        .safeLoadAll(text)
        .reduce((acc: object, doc: object) => { return {...acc, ...doc} }, {}))

      info(`Got stylefile from PR branch : ${json}`)
      return json
    }
    // no stylefile anywhere, use default styling
    catch (e) {
      info('Could not get stylefile, falling back to defaults.')
      return null
    }
  }
}

export async function getPRFileList (
  pulls: any,
  {owner, repo, pull_number}: types.PullRequestInfo
) {
  let page = 1
  const files: types.GitFile[] = []

  let gotFiles
  do {
    const response = await pulls.listFiles({
      owner,
      repo,
      pull_number,
      page,
      per_page: 50,
    })
    response.data.forEach(({filename, sha}: types.GitFile) => {
      files.push({filename, sha})
    })

    gotFiles = response.data.length > 0 ? true : false
    page++
  }
  while (gotFiles)

  return files
}

export async function getFile (
  git: any,
  {owner, repo, filename, sha}: types.GitFile) {
  return git
    .getBlob({
      owner,
      repo,
      file_sha: sha,
    })
    .then(({ data }: any) => {
      const buffer = Buffer.from(data.content, 'base64')
      const text = buffer.toString('utf8')
      return {
        filename,
        content: text,
      }
    })
    .catch((e: Error) => {
      return {
        filename,
        exception: e,
      }
    })
}
